import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { Alert } from 'react-native';

import { createId } from '@/lib/id';
import { estimateMaintenanceCost } from '@/lib/maintenance-cost';
import { findModelEntry, inferBikeCategory } from '@/lib/bike-models';
import {
  getDefaultMaintenancePresets,
  maintenancePresetCatalog,
} from '@/lib/onboarding';
import { claimReferralCodeForUser, normalizeReferralCode, toReferralRecord } from '@/lib/referrals';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/query-client';
import { useAppStore } from '@/store/app-store';
import { useLocalAppStore } from '@/store/local-app-store';
import { useBlockedUsersStore } from '@/store/blocked-users-store';
import type {
  Bike,
  EmergencyInfo,
  FuelLog,
  MaintenancePresetKey,
  MaintenanceTask,
  Profile,
  ReferralRecord,
  RideDashboardMetrics,
  RideFeedRecord,
  RideListing,
  RideListingFeedRow,
  RideRecord,
} from '@/types/domain';

type QueryToggleOptions = {
  enabled?: boolean;
};

type BikeSaveInput = Omit<Bike, 'id'> & {
  id?: string;
  maintenancePresetKeys?: MaintenancePresetKey[];
};

type BikeMetadataUpdateInput = {
  id: string;
  nickname?: string | null;
  current_odometer_km?: number;
};

const EMPTY_ROUTE_GEOJSON: GeoJSON.Feature<GeoJSON.LineString> = {
  type: 'Feature',
  properties: {},
  geometry: {
    type: 'LineString',
    coordinates: [],
  },
};

function toMaintenanceTemplates(keys: MaintenancePresetKey[], category: Bike['category']) {
  const fallbackKeys = keys.length ? keys : getDefaultMaintenancePresets(category);
  return fallbackKeys.map((key) => {
    const preset = maintenancePresetCatalog[key];
    return {
      task_name: preset.taskName,
      cost: estimateMaintenanceCost(preset.taskName),
      interval_km: preset.intervalKm,
      interval_days: preset.intervalDays,
    };
  });
}

async function reconcileMaintenanceTemplates({
  bikeId,
  category,
  currentOdometerKm,
  selectedPresetKeys,
  userId,
  setMaintenanceTasksForBike,
}: {
  bikeId: string;
  category: Bike['category'];
  currentOdometerKm: number;
  selectedPresetKeys: MaintenancePresetKey[];
  userId?: string;
  setMaintenanceTasksForBike: (bikeId: string, tasks: MaintenanceTask[]) => void;
}) {
  const desiredTemplates = toMaintenanceTemplates(selectedPresetKeys, category);
  const desiredByName = new Map(desiredTemplates.map((template) => [template.task_name, template]));

  if (supabase && userId) {
    const client = supabase as any;
    const { data, error } = await client.from('maintenance_tasks').select('*').eq('bike_id', bikeId);
    if (error) {
      throw error;
    }

    const existingTasks = (data as MaintenanceTask[]) ?? [];
    const existingByName = new Map(existingTasks.map((task) => [task.task_name, task]));

    const toDelete = existingTasks.filter((task) => !desiredByName.has(task.task_name));
    const toInsert = desiredTemplates.filter((template) => !existingByName.has(template.task_name));
    const toUpdate = existingTasks.filter((task) => desiredByName.has(task.task_name));

    if (toDelete.length) {
      const { error: deleteError } = await client.from('maintenance_tasks').delete().in(
        'id',
        toDelete.map((task) => task.id),
      );
      if (deleteError) {
        throw deleteError;
      }
    }

    for (const task of toUpdate) {
      const template = desiredByName.get(task.task_name)!;
      if (task.interval_km === template.interval_km && task.interval_days === template.interval_days) {
        continue;
      }

      const { error: updateError } = await client
        .from('maintenance_tasks')
        .update({
          cost: task.cost ?? template.cost,
          interval_km: template.interval_km,
          interval_days: template.interval_days,
        } as any)
        .eq('id', task.id);

      if (updateError) {
        throw updateError;
      }
    }

    if (toInsert.length) {
      const { error: insertError } = await client.from('maintenance_tasks').insert(
        toInsert.map((template) => ({
          bike_id: bikeId,
          task_name: template.task_name,
          cost: template.cost,
          interval_km: template.interval_km,
          interval_days: template.interval_days ?? null,
          last_done_odometer_km: currentOdometerKm,
          last_done_date: new Date().toISOString().slice(0, 10),
        })) as any,
      );
      if (insertError) {
        throw insertError;
      }
    }

    const { data: refreshedData, error: refreshedError } = await client
      .from('maintenance_tasks')
      .select('*')
      .eq('bike_id', bikeId);
    if (refreshedError) {
      throw refreshedError;
    }
    setMaintenanceTasksForBike(bikeId, refreshedData as MaintenanceTask[]);
    await queryClient.invalidateQueries({ queryKey: ['maintenance', bikeId] });
    return;
  }

  const localTasks: MaintenanceTask[] = desiredTemplates.map((template) => ({
    id: createId(),
    bike_id: bikeId,
    task_name: template.task_name,
    cost: template.cost,
    interval_km: template.interval_km,
    interval_days: template.interval_days,
    last_done_odometer_km: currentOdometerKm,
    last_done_date: new Date().toISOString().slice(0, 10),
  }));

  setMaintenanceTasksForBike(bikeId, localTasks);
}

function useRemoteMode(userId?: string) {
  return Boolean(userId) && isSupabaseConfigured;
}

function cleanDraftValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function toRouteFeature(value: unknown) {
  if (
    value
    && typeof value === 'object'
    && (value as GeoJSON.Feature<GeoJSON.LineString>).type === 'Feature'
    && (value as GeoJSON.Feature<GeoJSON.LineString>).geometry?.type === 'LineString'
  ) {
    return value as GeoJSON.Feature<GeoJSON.LineString>;
  }

  return EMPTY_ROUTE_GEOJSON;
}

function toRideFeedRecord(record: RideRecord): RideFeedRecord {
  return {
    id: record.id,
    bike_id: record.bike_id,
    mode: record.mode,
    started_at: record.started_at,
    ended_at: record.ended_at,
    distance_km: record.distance_km,
    max_speed_kmh: record.max_speed_kmh,
    avg_speed_kmh: record.avg_speed_kmh,
    fuel_used_liters: record.fuel_used_liters,
    elevation_gain_m: record.elevation_gain_m,
    mood: record.mood,
    route_bounds: record.route_bounds,
    sync_status: record.sync_status,
    route_preview_geojson: record.route_preview_geojson ?? record.route_geojson,
  };
}

function mergeRideRecords(rides: RideRecord[], pendingRides: RideRecord[]) {
  const merged = new Map<string, RideRecord>();

  rides.forEach((ride) => {
    merged.set(ride.id, { ...ride, sync_status: ride.sync_status ?? 'synced' });
  });

  pendingRides.forEach((ride) => {
    merged.set(ride.id, { ...ride, sync_status: 'pending' });
  });

  return Array.from(merged.values()).sort(
    (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
  );
}

function mergeRideFeedRecords(rides: RideRecord[], pendingRides: RideRecord[], limit: number) {
  const merged = new Map<string, RideFeedRecord>();

  rides.forEach((ride) => {
    merged.set(ride.id, toRideFeedRecord({ ...ride, sync_status: ride.sync_status ?? 'synced' }));
  });

  pendingRides.forEach((ride) => {
    merged.set(ride.id, toRideFeedRecord({ ...ride, sync_status: 'pending' }));
  });

  return Array.from(merged.values())
    .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
    .slice(0, limit);
}

function mergeRecentRideFeed(remoteRides: RideFeedRecord[], pendingRides: RideRecord[], limit: number) {
  const merged = new Map<string, RideFeedRecord>(remoteRides.map((ride) => [ride.id, ride]));

  pendingRides.forEach((ride) => {
    merged.set(ride.id, toRideFeedRecord({ ...ride, sync_status: 'pending' }));
  });

  return Array.from(merged.values())
    .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
    .slice(0, limit);
}

function buildLocalRideDashboardMetrics(
  rides: RideRecord[],
  fuelLogs: FuelLog[],
  tasks: MaintenanceTask[],
): RideDashboardMetrics {
  const latestRide = [...rides].sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())[0];
  const latestFuelPrice = fuelLogs[0]?.price_per_liter ?? 65;
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const todayRides = rides.filter((ride) => ride.started_at.slice(0, 10) === today);
  const monthRides = rides.filter((ride) => new Date(ride.started_at).getTime() >= monthStart);
  const monthDistance = monthRides.reduce((sum, ride) => sum + ride.distance_km, 0);
  const todayFuelCost = todayRides.reduce((sum, ride) => sum + (ride.fuel_used_liters ?? 0) * latestFuelPrice, 0);
  const monthFuelLogs = fuelLogs.filter((log) => new Date(log.logged_at).getTime() >= monthStart);
  const monthFuelCost = monthFuelLogs.length
    ? monthFuelLogs.reduce((sum, log) => sum + log.total_cost, 0)
    : monthRides.reduce((sum, ride) => sum + (ride.fuel_used_liters ?? 0) * latestFuelPrice, 0);
  const maintenancePerKm = tasks.reduce((sum, task) => (
    task.interval_km > 0 ? sum + ((task.cost ?? 500) / task.interval_km) : sum
  ), 0);
  const monthMaintenanceAccrual = monthDistance * maintenancePerKm;
  const monthTotalCost = monthFuelCost + monthMaintenanceAccrual;

  return {
    latest_ride_id: latestRide?.id ?? null,
    latest_ride_distance_km: latestRide?.distance_km ?? 0,
    latest_ride_max_speed_kmh: latestRide?.max_speed_kmh ?? 0,
    latest_ride_fuel_used_liters: latestRide?.fuel_used_liters ?? 0,
    latest_ride_started_at: latestRide?.started_at ?? null,
    latest_fuel_price: latestFuelPrice,
    today_earnings: 0,
    today_fuel_cost: todayFuelCost,
    today_trip_count: todayRides.length,
    month_distance_km: monthDistance,
    month_fuel_cost: monthFuelCost,
    month_maintenance_accrual: monthMaintenanceAccrual,
    month_total_cost: monthTotalCost,
    month_cost_per_km: monthDistance > 0 ? monthTotalCost / monthDistance : 0,
  };
}

export function useBikes(userId?: string) {
  const localBikes = useLocalAppStore((state) => state.bikes);
  const useRemote = useRemoteMode(userId);

  const query = useQuery({
    queryKey: ['bikes', userId ?? 'local'],
    enabled: useRemote,
    queryFn: async () => {
      if (!supabase || !userId) return localBikes;
      const { data, error } = await supabase.from('bikes').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      if (error) throw error;
      return data as Bike[];
    },
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
  });

  if (!useRemote) {
    return { data: localBikes, isLoading: false, error: null, isFetching: false };
  }

  return query;
}

export function useMaintenanceTasks(bikeId?: string) {
  const localTasks = useLocalAppStore((state) => state.maintenanceTasks);
  const filteredLocal = bikeId ? localTasks.filter((task) => task.bike_id === bikeId) : [];
  const useRemote = Boolean(bikeId) && isSupabaseConfigured;

  const query = useQuery({
    queryKey: ['maintenance', bikeId ?? 'local'],
    enabled: useRemote && Boolean(bikeId),
    queryFn: async () => {
      if (!supabase || !bikeId) return filteredLocal;
      const { data, error } = await supabase.from('maintenance_tasks').select('*').eq('bike_id', bikeId);
      if (error) throw error;
      return data as MaintenanceTask[];
    },
  });

  if (!useRemote) {
    return { data: filteredLocal, isLoading: false, error: null, isFetching: false };
  }

  return query;
}

export function useRides(userId?: string, options?: QueryToggleOptions) {
  const localRides = useLocalAppStore((state) => state.rides);
  const pendingRides = useLocalAppStore((state) => state.pendingRides);
  const useRemote = useRemoteMode(userId);
  const isEnabled = options?.enabled ?? true;
  const localMergedRides = useMemo(
    () => mergeRideRecords(localRides, pendingRides),
    [localRides, pendingRides],
  );

  const query = useQuery({
    queryKey: ['rides', userId ?? 'local'],
    enabled: useRemote && isEnabled,
    queryFn: async () => {
      if (!supabase || !userId) return localMergedRides;
      const { data, error } = await supabase.from('rides').select('*').eq('user_id', userId).order('started_at', { ascending: false });
      if (error) throw error;
      return mergeRideRecords(
        (data as unknown as RideRecord[]).map((ride) => ({ ...ride, sync_status: 'synced' })),
        pendingRides,
      );
    },
    staleTime: 2 * 60_000,
    gcTime: 10 * 60_000,
  });

  if (!useRemote) {
    return { data: localMergedRides, isLoading: false, error: null, isFetching: false };
  }

  return query;
}

export function useRecentRideFeed(userId?: string, limit = 12, options?: QueryToggleOptions) {
  const localRides = useLocalAppStore((state) => state.rides);
  const pendingRides = useLocalAppStore((state) => state.pendingRides);
  const useRemote = useRemoteMode(userId);
  const isEnabled = options?.enabled ?? true;
  const localFeed = useMemo(
    () => mergeRideFeedRecords(localRides, pendingRides, limit),
    [limit, localRides, pendingRides],
  );

  const query = useQuery({
    queryKey: ['rides-feed', userId ?? 'local', limit],
    enabled: useRemote && isEnabled,
    queryFn: async () => {
      if (!supabase || !userId) return localFeed;
      const { data, error } = await supabase
        .from('rides')
        .select('id, bike_id, mode, started_at, ended_at, distance_km, max_speed_kmh, avg_speed_kmh, fuel_used_liters, elevation_gain_m, mood, route_preview_geojson, route_bounds')
        .eq('user_id', userId)
        .order('started_at', { ascending: false })
        .limit(limit);
      if (error) throw error;

      const remote = ((data ?? []) as any[]).map((ride) => ({
        ...ride,
        route_preview_geojson: toRouteFeature(ride.route_preview_geojson),
        route_bounds: ride.route_bounds,
        sync_status: 'synced' as const,
      })) as RideFeedRecord[];

      return mergeRecentRideFeed(remote, pendingRides, limit);
    },
    staleTime: 60_000,
    gcTime: 10 * 60_000,
  });

  if (!useRemote) {
    return { data: localFeed, isLoading: false, error: null, isFetching: false };
  }

  return query;
}

export function useRideDetails(rideId?: string, userId?: string) {
  const localRides = useLocalAppStore((state) => state.rides);
  const pendingRides = useLocalAppStore((state) => state.pendingRides);
  const useRemote = useRemoteMode(userId) && Boolean(rideId);
  const cachedDetailRide = rideId
    ? queryClient.getQueryData<RideRecord>(['ride-details', userId ?? 'local', rideId]) ?? null
    : null;
  const cachedRemoteRide = rideId
    ? queryClient.getQueryData<RideRecord[]>(['rides', userId ?? 'local'])?.find((ride) => ride.id === rideId) ?? null
    : null;
  const cachedFeedRide = rideId
    ? queryClient.getQueriesData<RideFeedRecord[]>({ queryKey: ['rides-feed', userId ?? 'local'] })
      .flatMap(([, rides]) => rides ?? [])
      .find((ride) => ride.id === rideId) ?? null
    : null;
  const localRide = cachedDetailRide
    ?? cachedRemoteRide
    ?? (
      rideId && cachedFeedRide
        ? {
            ...cachedFeedRide,
            route_geojson: cachedFeedRide.route_preview_geojson,
            route_preview_geojson: cachedFeedRide.route_preview_geojson,
            route_point_count_raw: 0,
            route_point_count_simplified: 0,
          }
        : null
    )
    ?? [...pendingRides, ...localRides].find((ride) => ride.id === rideId)
    ?? null;

  const query = useQuery({
    queryKey: ['ride-details', userId ?? 'local', rideId ?? 'none'],
    enabled: useRemote,
    queryFn: async () => {
      if (!supabase || !userId || !rideId) {
        return localRide;
      }

      const { data, error } = await supabase
        .from('rides')
        .select('*')
        .eq('user_id', userId)
        .eq('id', rideId)
        .single();
      if (error) throw error;

      const row = data as any;
      return {
        ...row,
        route_geojson: toRouteFeature(row.route_geojson),
        route_preview_geojson: toRouteFeature(row.route_preview_geojson ?? row.route_geojson),
      } as RideRecord;
    },
    initialData: localRide,
  });

  if (!useRemote) {
    return { data: localRide, isLoading: false, error: null, isFetching: false };
  }

  return query;
}

export function useFuelLogs(userId?: string) {
  const localFuelLogs = useLocalAppStore((state) => state.fuelLogs);
  const useRemote = useRemoteMode(userId);

  const query = useQuery({
    queryKey: ['fuel-logs', userId ?? 'local'],
    enabled: useRemote,
    queryFn: async () => {
      if (!supabase || !userId) return localFuelLogs;
      const { data, error } = await supabase.from('fuel_logs').select('*').eq('user_id', userId).order('logged_at', { ascending: false });
      if (error) throw error;
      return data as FuelLog[];
    },
  });

  if (!useRemote) {
    return { data: localFuelLogs, isLoading: false, error: null, isFetching: false };
  }

  return query;
}

export function useEmergencyInfo(userId?: string) {
  const localEmergencyInfo = useLocalAppStore((state) => state.emergencyInfo);
  const useRemote = useRemoteMode(userId);

  const query = useQuery({
    queryKey: ['emergency', userId ?? 'local'],
    enabled: useRemote,
    queryFn: async () => {
      if (!supabase || !userId) return localEmergencyInfo;
      const { data, error } = await supabase
        .from('emergency_info')
        .select('*')
        .eq('user_id', userId)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as EmergencyInfo | null) ?? localEmergencyInfo;
    },
  });

  if (!useRemote) {
    return { data: localEmergencyInfo, isLoading: false, error: null, isFetching: false };
  }

  return query;
}

export function useReferrals(userId?: string) {
  const localReferrals = useLocalAppStore((state) => state.referrals);
  const useRemote = useRemoteMode(userId);
  const filteredLocal = userId
    ? localReferrals.filter(
        (item) => item.referrer_user_id === userId || item.referred_user_id === userId,
      )
    : localReferrals;

  const query = useQuery({
    queryKey: ['referrals', userId ?? 'local'],
    enabled: useRemote,
    queryFn: async () => {
      if (!supabase || !userId) {
        return filteredLocal;
      }

      const { data, error } = await supabase
        .from('referrals')
        .select('*')
        .or(`referrer_user_id.eq.${userId},referred_user_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return (data as any[]).map(toReferralRecord);
    },
  });

  if (!useRemote) {
    return { data: filteredLocal, isLoading: false, error: null, isFetching: false };
  }

  return query;
}

export function useProfileMutations(userId?: string) {
  const queryClient = useQueryClient();
  const updateProfileLocal = useLocalAppStore((state) => state.updateProfile);

  const updateReferralCode = useMutation({
    mutationFn: async (nextCode: string) => {
      const normalizedCode = normalizeReferralCode(nextCode);

      if (!normalizedCode) {
        throw new Error('Referral codes must use letters and numbers only.');
      }

      if (supabase && userId) {
        const client = supabase as any;
        const { data, error } = await client
          .from('profiles')
          .update({ referral_code: normalizedCode })
          .eq('id', userId)
          .select('*')
          .single();

        if (error) {
          throw error;
        }

        const profile = data as any;
        const savedProfile: Profile = {
          id: profile.id,
          display_name: profile.display_name ?? 'Kurbada Rider',
          avatar_url: profile.avatar_url,
          created_at: profile.created_at,
          subscription_status: profile.subscription_status,
          subscription_expires_at: profile.subscription_expires_at,
          access_override: profile.access_override,
          referral_code: profile.referral_code,
        };

        updateProfileLocal(savedProfile);
        return savedProfile;
      }

      updateProfileLocal({ referral_code: normalizedCode });
      return { ...useLocalAppStore.getState().profile, referral_code: normalizedCode };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['profile', userId ?? 'local'] });
    },
  });

  return { updateReferralCode };
}

export function useReferralMutations(userId?: string) {
  const queryClient = useQueryClient();
  const upsertReferralLocal = useLocalAppStore((state) => state.upsertReferral);
  const markReferralNotifiedLocal = useLocalAppStore((state) => state.markReferralNotified);

  const applyReferralCode = useMutation({
    mutationFn: async ({
      code,
      referredDisplayName,
    }: {
      code: string;
      referredDisplayName?: string;
    }) => {
      if (!userId) {
        throw new Error('Sign in to apply a referral code.');
      }

      const referral = await claimReferralCodeForUser({
        code,
        referredUserId: userId,
        referredDisplayName,
      });
      upsertReferralLocal(referral);
      return referral;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['referrals', userId ?? 'local'] });
    },
  });

  const markReferralNotified = useMutation({
    mutationFn: async (referralId: string) => {
      const notifiedAt = new Date().toISOString();

      if (supabase && userId) {
        const client = supabase as any;
        const { data, error } = await client
          .from('referrals')
          .update({ notified_at: notifiedAt })
          .eq('id', referralId)
          .select('*')
          .single();

        if (error) {
          throw error;
        }

        const referral = toReferralRecord(data);
        markReferralNotifiedLocal(referral.id, referral.notified_at ?? notifiedAt);
        return referral;
      }

      markReferralNotifiedLocal(referralId, notifiedAt);
      return useLocalAppStore.getState().referrals.find((item) => item.id === referralId) as ReferralRecord;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['referrals', userId ?? 'local'] });
    },
  });

  return { applyReferralCode, markReferralNotified };
}

export function useBikeMutations(userId?: string) {
  const queryClient = useQueryClient();
  const upsertBikeLocal = useLocalAppStore((state) => state.upsertBike);
  const deleteBikeLocal = useLocalAppStore((state) => state.deleteBike);
  const setMaintenanceTasksForBike = useLocalAppStore((state) => state.setMaintenanceTasksForBike);
  const localBikes = useLocalAppStore((state) => state.bikes);

  const upsertBikeCaches = (savedBike: Bike) => {
    upsertBikeLocal(savedBike);
    queryClient.setQueryData<Bike[]>(['bikes', userId ?? 'local'], (current = []) => (
      current.some((item) => item.id === savedBike.id)
        ? current.map((item) => (item.id === savedBike.id ? savedBike : item))
        : [savedBike, ...current]
    ));
  };

  const saveBikeSetup = useMutation({
    mutationFn: async (bike: BikeSaveInput) => {
      if (supabase && userId) {
        const client = supabase as any;
        const payload = {
          make: bike.make,
          model: bike.model,
          nickname: bike.nickname ?? null,
          year: bike.year,
          engine_cc: bike.engine_cc,
          current_odometer_km: bike.current_odometer_km,
          category: bike.category,
          user_id: userId,
        };

        const isEditingExistingBike = Boolean(bike.id);
        const hasPresetSelection = Array.isArray(bike.maintenancePresetKeys) && bike.maintenancePresetKeys.length > 0;

        const builder = isEditingExistingBike
          ? client.from('bikes').update(payload).eq('id', bike.id).eq('user_id', userId)
          : client.from('bikes').insert(payload);

        const { data, error } = await builder.select().single();
        if (error) throw error;

        const savedBike = data as Bike;
        upsertBikeCaches(savedBike);

        if (hasPresetSelection) {
          await reconcileMaintenanceTemplates({
            bikeId: savedBike.id,
            category: savedBike.category,
            currentOdometerKm: savedBike.current_odometer_km,
            selectedPresetKeys: bike.maintenancePresetKeys ?? [],
            userId,
            setMaintenanceTasksForBike,
          });
        } else if (!isEditingExistingBike) {
          await queryClient.invalidateQueries({ queryKey: ['maintenance', savedBike.id] });
        }

        return savedBike;
      }

      const localBike: Bike = { ...bike, id: bike.id || createId() };
      upsertBikeCaches(localBike);
      await reconcileMaintenanceTemplates({
        bikeId: localBike.id,
        category: localBike.category,
        currentOdometerKm: localBike.current_odometer_km,
        selectedPresetKeys: bike.maintenancePresetKeys ?? [],
        setMaintenanceTasksForBike,
      });
      return localBike;
    },
    onSuccess: async (bike) => {
      await queryClient.invalidateQueries({ queryKey: ['bikes', userId ?? 'local'] });
      await queryClient.invalidateQueries({ queryKey: ['maintenance', bike.id] });
      await queryClient.invalidateQueries({ queryKey: ['maintenance-overview', userId ?? 'local'] });
      await queryClient.invalidateQueries({ queryKey: ['ride-dashboard-metrics', userId ?? 'local'] });
    },
  });

  const updateBikeMetadata = useMutation({
    mutationFn: async ({ id, ...changes }: BikeMetadataUpdateInput) => {
      const currentBike = queryClient.getQueryData<Bike[]>(['bikes', userId ?? 'local'])?.find((item) => item.id === id)
        ?? localBikes.find((item) => item.id === id);

      if (!currentBike) {
        throw new Error('Bike not found.');
      }

      const cleanedChanges = Object.fromEntries(
        Object.entries(changes).filter(([, value]) => value !== undefined),
      ) as Partial<Bike>;

      if (!Object.keys(cleanedChanges).length) {
        return currentBike;
      }

      if (supabase && userId) {
        const client = supabase as any;
        const { data, error } = await client
          .from('bikes')
          .update(cleanedChanges)
          .eq('id', id)
          .eq('user_id', userId)
          .select()
          .single();
        if (error) throw error;
        const savedBike = data as Bike;
        upsertBikeCaches(savedBike);
        return savedBike;
      }

      const savedBike = { ...currentBike, ...cleanedChanges };
      upsertBikeCaches(savedBike);
      return savedBike;
    },
    onSuccess: async (bike) => {
      await queryClient.invalidateQueries({ queryKey: ['bikes', userId ?? 'local'] });
      await queryClient.invalidateQueries({ queryKey: ['maintenance', bike.id] });
      await queryClient.invalidateQueries({ queryKey: ['maintenance-overview', userId ?? 'local'] });
      await queryClient.invalidateQueries({ queryKey: ['ride-dashboard-metrics', userId ?? 'local'] });
    },
  });

  const deleteBike = useMutation({
    mutationFn: async (bikeId: string) => {
      if (supabase) {
        await Promise.all([
          supabase.from('maintenance_tasks').delete().eq('bike_id', bikeId),
          supabase.from('fuel_logs').delete().eq('bike_id', bikeId),
          supabase.from('rides').delete().eq('bike_id', bikeId),
          supabase.from('bikes').delete().eq('id', bikeId),
        ]);
      }
      deleteBikeLocal(bikeId);
      return bikeId;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['bikes', userId ?? 'local'] });
      await queryClient.invalidateQueries({ queryKey: ['maintenance-overview', userId ?? 'local'] });
      await queryClient.invalidateQueries({ queryKey: ['ride-dashboard-metrics', userId ?? 'local'] });
    },
  });

  return { saveBikeSetup, updateBikeMetadata, deleteBike };
}

export function useRideMutations(userId?: string) {
  const queryClient = useQueryClient();
  const saveRideLocal = useLocalAppStore((state) => state.saveRide);
  const deleteRideLocal = useLocalAppStore((state) => state.deleteRide);
  const addPendingRideLocal = useLocalAppStore((state) => state.addPendingRide);
  const removePendingRideLocal = useLocalAppStore((state) => state.removePendingRide);

  const mergeRideIntoCache = (ride: RideRecord) => {
    queryClient.setQueryData<RideRecord[]>(['rides', userId ?? 'local'], (current = []) => {
      const next = new Map(current.map((item) => [item.id, item]));
      next.set(ride.id, ride);
      return Array.from(next.values()).sort(
        (a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime(),
      );
    });
    queryClient.setQueryData<RideFeedRecord[]>(['rides-feed', userId ?? 'local', 12], (current = []) => {
      const next = new Map(current.map((item) => [item.id, item]));
      next.set(ride.id, toRideFeedRecord(ride));
      return Array.from(next.values())
        .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
        .slice(0, 12);
    });
    queryClient.setQueryData(['ride-details', userId ?? 'local', ride.id], ride);
  };

  const markRideSyncedInCache = (rideId: string) => {
    queryClient.setQueryData<RideRecord[]>(['rides', userId ?? 'local'], (current = []) => (
      current.map((ride) => (
        ride.id === rideId
          ? { ...ride, sync_status: 'synced' }
          : ride
      ))
    ));
    queryClient.setQueryData<RideFeedRecord[]>(['rides-feed', userId ?? 'local', 12], (current = []) => (
      current.map((ride) => (
        ride.id === rideId
          ? { ...ride, sync_status: 'synced' }
          : ride
      ))
    ));
    queryClient.setQueryData<RideRecord | null>(['ride-details', userId ?? 'local', rideId], (current) => (
      current ? { ...current, sync_status: 'synced' } : current
    ));
  };

  const saveRide = useMutation({
    retry: 2,
    retryDelay: (attemptIndex) =>
      Math.min(2000 * 2 ** attemptIndex + Math.random() * 1000, 20_000),
    mutationFn: async (ride: RideRecord) => {
      const localRide = { ...ride, sync_status: 'synced' as const };
      saveRideLocal(localRide);
      mergeRideIntoCache(localRide);

      if (supabase && userId) {
        const payload = {
          id: ride.id,
          bike_id: ride.bike_id,
          user_id: userId,
          mode: ride.mode,
          started_at: ride.started_at,
          ended_at: ride.ended_at,
          distance_km: ride.distance_km,
          max_speed_kmh: ride.max_speed_kmh,
          avg_speed_kmh: ride.avg_speed_kmh,
          max_lean_angle_deg: ride.max_lean_angle_deg ?? null,
          fuel_used_liters: ride.fuel_used_liters ?? null,
          elevation_gain_m: ride.elevation_gain_m ?? null,
          mood: ride.mood ?? null,
          route_geojson: ride.route_geojson,
          route_preview_geojson: ride.route_preview_geojson ?? ride.route_geojson,
          route_point_count_raw: ride.route_point_count_raw,
          route_point_count_simplified: ride.route_point_count_simplified,
          route_bounds: ride.route_bounds,
        };

        try {
          const { data, error } = await supabase.from('rides').upsert(payload as any, { onConflict: 'id' }).select().single();
          if (error) throw error;

          const savedRide = { ...(data as unknown as RideRecord), sync_status: 'synced' as const };
          saveRideLocal(savedRide);
          removePendingRideLocal(savedRide.id);
          mergeRideIntoCache(savedRide);
          return savedRide;
        } catch {
          const pendingRide = { ...ride, sync_status: 'pending' as const };
          addPendingRideLocal(pendingRide);
          mergeRideIntoCache(pendingRide);
          return pendingRide;
        }
      }

      return localRide;
    },
    onSuccess: async (ride) => {
      queryClient.setQueryData<RideFeedRecord[]>(['rides-feed', userId ?? 'local', 12], (current = []) => (
        current.map((item) => (
          item.id === ride.id
            ? { ...item, mood: ride.mood }
            : item
        ))
      ));
      queryClient.setQueryData<RideRecord | null>(['ride-details', userId ?? 'local', ride.id], (current) => (
        current ? { ...current, mood: ride.mood } : current
      ));
      await queryClient.invalidateQueries({ queryKey: ['rides', userId ?? 'local'] });
      await queryClient.invalidateQueries({ queryKey: ['ride-dashboard-metrics', userId ?? 'local'] });
    },
  });

  const updateRideMood = useMutation({
    mutationFn: async ({ rideId, mood }: { rideId: string; mood: RideRecord['mood'] }) => {
      if (supabase && userId) {
        const { data, error } = await (supabase as any)
          .from('rides')
          .update({ mood })
          .eq('id', rideId)
          .eq('user_id', userId)
          .select('*')
          .single();
        if (error) throw error;
        return data as RideRecord;
      }
      // local mode: mutate the local store in place via saveRide (upsert semantics)
      // find and replace the ride
      const store = (useLocalAppStore as any).getState?.();
      if (store?.rides) {
        const existing = store.rides.find((r: any) => r.id === rideId);
        if (existing) {
          saveRideLocal({ ...existing, mood });
        }
      }
      return { id: rideId, mood } as unknown as RideRecord;
    },
    onSuccess: async (ride) => {
      queryClient.setQueryData<RideFeedRecord[]>(['rides-feed', userId ?? 'local', 12], (current = []) => (
        current.map((item) => (
          item.id === ride.id
            ? { ...item, mood: ride.mood }
            : item
        ))
      ));
      queryClient.setQueryData<RideRecord | null>(['ride-details', userId ?? 'local', ride.id], (current) => (
        current ? { ...current, mood: ride.mood } : current
      ));
      await queryClient.invalidateQueries({ queryKey: ['rides', userId ?? 'local'] });
      await queryClient.invalidateQueries({ queryKey: ['ride-dashboard-metrics', userId ?? 'local'] });
    },
  });

  const deleteRide = useMutation({
    mutationFn: async (rideId: string) => {
      deleteRideLocal(rideId);
      queryClient.setQueryData<RideFeedRecord[]>(['rides-feed', userId ?? 'local', 12], (current = []) => current.filter((ride) => ride.id !== rideId));
      queryClient.removeQueries({ queryKey: ['ride-details', userId ?? 'local', rideId] });
      if (supabase) {
        await supabase.from('rides').delete().eq('id', rideId);
      }
      return rideId;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['rides', userId ?? 'local'] });
      await queryClient.invalidateQueries({ queryKey: ['ride-dashboard-metrics', userId ?? 'local'] });
    },
  });

  const syncPendingRides = useMutation({
    mutationFn: async () => {
      if (!supabase || !userId) return [];

      const { pendingRides: queuedRides } = useLocalAppStore.getState();
      if (!queuedRides.length) return [];

      const syncedIds: string[] = [];

      for (let i = 0; i < queuedRides.length; i++) {
        const ride = queuedRides[i];

        if (i > 0) {
          await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 1500));
        }

        try {
          const payload = {
            id: ride.id,
            bike_id: ride.bike_id,
            user_id: userId,
            mode: ride.mode,
            started_at: ride.started_at,
            ended_at: ride.ended_at,
            distance_km: ride.distance_km,
            max_speed_kmh: ride.max_speed_kmh,
            avg_speed_kmh: ride.avg_speed_kmh,
            max_lean_angle_deg: ride.max_lean_angle_deg ?? null,
            fuel_used_liters: ride.fuel_used_liters ?? null,
            elevation_gain_m: ride.elevation_gain_m ?? null,
            mood: ride.mood ?? null,
            route_geojson: ride.route_geojson,
            route_preview_geojson: ride.route_preview_geojson ?? ride.route_geojson,
            route_point_count_raw: ride.route_point_count_raw,
            route_point_count_simplified: ride.route_point_count_simplified,
            route_bounds: ride.route_bounds,
          };

          const { error } = await supabase.from('rides').upsert(payload as any, { onConflict: 'id' });
          if (!error) {
            removePendingRideLocal(ride.id);
            syncedIds.push(ride.id);
          }
        } catch {
          // Per-ride failure — skip to next, leave this one in pending
        }
      }

      return syncedIds;
    },
    onSuccess: async (syncedIds) => {
      if (!syncedIds.length) {
        return;
      }

      syncedIds.forEach(markRideSyncedInCache);
    },
  });

  return { saveRide, updateRideMood, deleteRide, syncPendingRides };
}

export function useFuelMutations(userId?: string) {
  const queryClient = useQueryClient();
  const saveFuelLogLocal = useLocalAppStore((state) => state.saveFuelLog);
  const deleteFuelLogLocal = useLocalAppStore((state) => state.deleteFuelLog);

  const saveFuelLog = useMutation({
    mutationFn: async (fuelLog: FuelLog) => {
      if (supabase && userId) {
        const payload = {
          bike_id: fuelLog.bike_id,
          logged_at: fuelLog.logged_at,
          liters: fuelLog.liters,
          price_per_liter: fuelLog.price_per_liter,
          total_cost: fuelLog.total_cost,
          octane_rating: fuelLog.octane_rating,
          station_name: fuelLog.station_name ?? null,
          user_id: userId,
        };

        const builder = fuelLog.id
          ? supabase.from('fuel_logs').upsert({ ...payload, id: fuelLog.id } as any, { onConflict: 'id' })
          : supabase.from('fuel_logs').insert(payload as any);

        const { data, error } = await builder.select().single();
        if (error) throw error;
        const savedFuelLog = data as FuelLog;
        saveFuelLogLocal(savedFuelLog);
        return savedFuelLog;
      }

      const localFuelLog = { ...fuelLog, id: fuelLog.id || createId() };
      saveFuelLogLocal(localFuelLog);
      return localFuelLog;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['fuel-logs', userId ?? 'local'] });
      await queryClient.invalidateQueries({ queryKey: ['ride-dashboard-metrics', userId ?? 'local'] });
    },
  });

  const deleteFuelLog = useMutation({
    mutationFn: async (fuelLogId: string) => {
      deleteFuelLogLocal(fuelLogId);
      if (supabase) {
        await supabase.from('fuel_logs').delete().eq('id', fuelLogId);
      }
      return fuelLogId;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['fuel-logs', userId ?? 'local'] });
      await queryClient.invalidateQueries({ queryKey: ['ride-dashboard-metrics', userId ?? 'local'] });
    },
  });

  return { saveFuelLog, deleteFuelLog };
}

export function useMaintenanceMutations(userId?: string) {
  const queryClient = useQueryClient();
  const addMaintenanceTaskLocal = useLocalAppStore((state) => state.addMaintenanceTask);
  const updateMaintenanceTaskLocal = useLocalAppStore((state) => state.updateMaintenanceTask);
  const deleteMaintenanceTaskLocal = useLocalAppStore((state) => state.deleteMaintenanceTask);

  const upsertMaintenanceCache = (bikeId: string, updater: (current: MaintenanceTask[]) => MaintenanceTask[]) => {
    queryClient.setQueryData<MaintenanceTask[]>(['maintenance', bikeId], (current = []) => updater(current));
  };

  const addMaintenanceTask = useMutation<MaintenanceTask, Error, Omit<MaintenanceTask, 'id'> & { id?: string }>({
    mutationFn: async (task: Omit<MaintenanceTask, 'id'> & { id?: string }) => {
      const newTask = { ...task, id: task.id || createId() } as MaintenanceTask;
      addMaintenanceTaskLocal(newTask);
      upsertMaintenanceCache(newTask.bike_id, (current) => (
        current.some((item) => item.id === newTask.id)
          ? current.map((item) => (item.id === newTask.id ? newTask : item))
          : [newTask, ...current]
      ));

      if (supabase && userId) {
        const { data, error } = await supabase
          .from('maintenance_tasks')
          .insert({
            id: newTask.id,
            bike_id: newTask.bike_id,
            task_name: newTask.task_name,
            cost: newTask.cost ?? null,
            interval_km: newTask.interval_km,
            interval_days: newTask.interval_days ?? null,
            last_done_odometer_km: newTask.last_done_odometer_km,
            last_done_date: newTask.last_done_date,
            } as any)
          .select()
          .single();
        if (error) throw error;
        addMaintenanceTaskLocal(data as MaintenanceTask);
        upsertMaintenanceCache(newTask.bike_id, (current) => (
          current.map((item) => (item.id === newTask.id ? (data as MaintenanceTask) : item))
        ));
        return data as MaintenanceTask;
      }

      return newTask;
    },
    onSuccess: async (task) => {
      await queryClient.invalidateQueries({ queryKey: ['maintenance', task.bike_id] });
      await queryClient.invalidateQueries({ queryKey: ['maintenance-overview', userId ?? 'local'] });
      await queryClient.invalidateQueries({ queryKey: ['ride-dashboard-metrics', userId ?? 'local'] });
    },
  });

  const updateMaintenanceTask = useMutation({
    mutationFn: async (task: MaintenanceTask) => {
      updateMaintenanceTaskLocal(task);
      upsertMaintenanceCache(task.bike_id, (current) => current.map((item) => (item.id === task.id ? task : item)));

      if (supabase) {
        const client = supabase as any;
        await client.from('maintenance_tasks').update({
          cost: task.cost ?? null,
          interval_km: task.interval_km,
          interval_days: task.interval_days,
          last_done_odometer_km: task.last_done_odometer_km,
          last_done_date: task.last_done_date,
        }).eq('id', task.id);
      }

      return task;
    },
    onSuccess: async (task) => {
      await queryClient.invalidateQueries({ queryKey: ['maintenance', task.bike_id] });
      await queryClient.invalidateQueries({ queryKey: ['maintenance-overview', userId ?? 'local'] });
      await queryClient.invalidateQueries({ queryKey: ['ride-dashboard-metrics', userId ?? 'local'] });
    },
  });

  const deleteMaintenanceTask = useMutation({
    mutationFn: async ({ taskId, bikeId }: { taskId: string; bikeId: string }) => {
      deleteMaintenanceTaskLocal(taskId);
      upsertMaintenanceCache(bikeId, (current) => current.filter((item) => item.id !== taskId));
      if (supabase) {
        await supabase.from('maintenance_tasks').delete().eq('id', taskId);
      }
      return { taskId, bikeId };
    },
    onSuccess: async ({ bikeId }) => {
      await queryClient.invalidateQueries({ queryKey: ['maintenance', bikeId] });
      await queryClient.invalidateQueries({ queryKey: ['maintenance-overview', userId ?? 'local'] });
      await queryClient.invalidateQueries({ queryKey: ['ride-dashboard-metrics', userId ?? 'local'] });
    },
  });

  return { addMaintenanceTask, updateMaintenanceTask, deleteMaintenanceTask };
}

export function useEmergencyMutations(userId?: string) {
  const queryClient = useQueryClient();
  const updateEmergencyInfoLocal = useLocalAppStore((state) => state.updateEmergencyInfo);

  const saveEmergencyInfo = useMutation({
    mutationFn: async (info: EmergencyInfo) => {
      if (supabase && userId) {
        const client = supabase as any;
        const payload = {
          full_name: info.full_name,
          blood_type: info.blood_type,
          allergies: info.allergies,
          conditions: info.conditions,
          contact1_name: info.contact1_name,
          contact1_phone: info.contact1_phone,
          contact2_name: info.contact2_name,
          contact2_phone: info.contact2_phone,
          user_id: userId,
        };

        const existingResponse = await client
          .from('emergency_info')
          .select('id')
          .eq('user_id', userId)
          .limit(1)
          .maybeSingle();
        const existingId = info.id || (existingResponse.data as { id?: string } | null)?.id;

        const builder = existingId
          ? client.from('emergency_info').update(payload).eq('id', existingId)
          : client.from('emergency_info').insert(payload);

        const { data, error } = await builder.select().single();
        if (error) throw error;
        const savedInfo = data as EmergencyInfo;
        updateEmergencyInfoLocal(savedInfo);
        queryClient.setQueryData(['emergency', userId], savedInfo);
        return savedInfo;
      }

      const localInfo = { ...info, id: info.id || createId() };
      updateEmergencyInfoLocal(localInfo);
      queryClient.setQueryData(['emergency', userId ?? 'local'], localInfo);
      return localInfo;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['emergency', userId ?? 'local'] });
    },
  });

  return { saveEmergencyInfo };
}

export function useOnboardingSync(userId?: string, userEmail?: string | null) {
  const onboardingData = useAppStore((state) => state.onboardingData);
  const onboardingDraftScope = useAppStore((state) => state.onboardingDraftScope);
  const onboardingDraftTargetMode = useAppStore((state) => state.onboardingDraftTargetMode);
  const onboardingDraftTargetEmail = useAppStore((state) => state.onboardingDraftTargetEmail);
  const onboardingSyncStatus = useAppStore((state) => state.onboardingSyncStatus);
  const onboardingSyncedUserId = useAppStore((state) => state.onboardingSyncedUserId);
  const markOnboardingSyncing = useAppStore((state) => state.markOnboardingSyncing);
  const markOnboardingSyncComplete = useAppStore((state) => state.markOnboardingSyncComplete);
  const markOnboardingSyncFailed = useAppStore((state) => state.markOnboardingSyncFailed);
  const clearAnonymousOnboardingDraft = useAppStore((state) => state.clearAnonymousOnboardingDraft);
  const completeBikeSetup = useAppStore((state) => state.completeBikeSetup);
  const bikes = useBikes(userId);
  const emergency = useEmergencyInfo(userId);
  const { saveBikeSetup } = useBikeMutations(userId);
  const { saveEmergencyInfo } = useEmergencyMutations(userId);
  const bikeBrand = cleanDraftValue(onboardingData.bikeBrand);
  const bikeModel = cleanDraftValue(onboardingData.bikeModel);
  const bikeYear = cleanDraftValue(onboardingData.bikeYear);
  const bikeEngineCc = cleanDraftValue(onboardingData.bikeEngineCc);
  const bikeOdometerKm = cleanDraftValue(onboardingData.bikeOdometerKm);
  const fullName = cleanDraftValue(onboardingData.fullName);
  const emergencyContactName = cleanDraftValue(onboardingData.emergencyContactName);
  const emergencyContactPhone = cleanDraftValue(onboardingData.emergencyContactPhone);
  const allergies = cleanDraftValue(onboardingData.allergies);
  const conditions = cleanDraftValue(onboardingData.conditions);

  const normalizedUserEmail = userEmail?.trim().toLowerCase() ?? null;
  const hasBikeDraft = Boolean(bikeBrand && bikeModel);
  const hasEmergencyMinimum = Boolean(
    fullName
      && emergencyContactName
      && emergencyContactPhone,
  );
  const canSyncDraftToUser = Boolean(
    userId
      && onboardingDraftScope === 'anonymous-signup'
      && onboardingDraftTargetMode === 'new-account-only'
      && onboardingDraftTargetEmail
      && normalizedUserEmail
      && onboardingDraftTargetEmail === normalizedUserEmail,
  );

  const needsSync =
    onboardingSyncStatus !== 'completed'
    || onboardingSyncedUserId !== userId;

  useEffect(() => {
    if (!userId || onboardingDraftScope !== 'anonymous-signup') {
      return;
    }

    if (
      onboardingDraftTargetMode !== 'new-account-only'
      || (
        onboardingDraftTargetEmail
        && normalizedUserEmail
        && onboardingDraftTargetEmail !== normalizedUserEmail
      )
    ) {
      clearAnonymousOnboardingDraft();
    }
  }, [
    clearAnonymousOnboardingDraft,
    normalizedUserEmail,
    onboardingDraftScope,
    onboardingDraftTargetEmail,
    onboardingDraftTargetMode,
    userId,
  ]);

  useQuery({
    queryKey: ['onboarding-sync', userId ?? 'none', normalizedUserEmail ?? 'none', onboardingSyncStatus, onboardingSyncedUserId, onboardingData],
    enabled:
      canSyncDraftToUser
      && needsSync
      && onboardingSyncStatus === 'pending'
      && (hasBikeDraft || hasEmergencyMinimum)
      && !bikes.isLoading
      && !emergency.isLoading,
    retry: false,
    queryFn: async () => {
      markOnboardingSyncing();
      console.info(
        `[bootstrap] onboarding_sync_started user=${userId ?? 'none'} bike_draft=${hasBikeDraft} emergency_draft=${hasEmergencyMinimum}`,
      );

      let syncedBikeId: string | null = null;
      let syncedEmergencyId: string | null = null;

      try {
        if (hasBikeDraft) {
          const inferredModel = findModelEntry(bikeBrand, bikeModel);
          const resolvedYear = Number(bikeYear) || new Date().getFullYear();
          const resolvedCc = Number(bikeEngineCc) || inferredModel?.cc || 0;
          const resolvedOdometer = Number(bikeOdometerKm) || 0;
          const resolvedCategory = onboardingData.bikeCategory || inferBikeCategory({ model: bikeModel, cc: resolvedCc });
          const existingBike = bikes.data?.find(
            (item) =>
              item.make.toLowerCase() === bikeBrand.toLowerCase()
              && item.model.toLowerCase() === bikeModel.toLowerCase()
              && item.year === resolvedYear,
          );

          const bike = await saveBikeSetup.mutateAsync({
            id: existingBike?.id,
            make: bikeBrand,
            model: bikeModel,
            year: resolvedYear,
            engine_cc: resolvedCc,
            current_odometer_km: resolvedOdometer,
            category: resolvedCategory,
            maintenancePresetKeys: onboardingData.maintenancePresetKeys,
          });

          syncedBikeId = bike.id;
          console.info(`[bootstrap] onboarding_sync_bike_saved bike=${bike.id}`);
          completeBikeSetup();
        }

        if (hasEmergencyMinimum) {
          const savedEmergency = await saveEmergencyInfo.mutateAsync({
            id: emergency.data?.id ?? '',
            full_name: fullName,
            blood_type: onboardingData.bloodType,
            allergies,
            conditions,
            contact1_name: emergencyContactName,
            contact1_phone: emergencyContactPhone,
            contact2_name: emergency.data?.contact2_name ?? '',
            contact2_phone: emergency.data?.contact2_phone ?? '',
          });
          syncedEmergencyId = savedEmergency.id;
          console.info(`[bootstrap] onboarding_sync_emergency_saved emergency=${savedEmergency.id}`);
        }

        markOnboardingSyncComplete({
          userId: userId!,
          bikeId: syncedBikeId,
          emergencyId: syncedEmergencyId,
        });

        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['bikes', userId ?? 'local'] }),
          queryClient.invalidateQueries({ queryKey: ['emergency', userId ?? 'local'] }),
        ]);

        return { syncedBikeId, syncedEmergencyId };
      } catch (error) {
        markOnboardingSyncFailed();
        console.warn(
          `[bootstrap] onboarding_sync_failed user=${userId ?? 'none'} message=${
            error instanceof Error ? error.message : 'unknown'
          }`,
        );
        Alert.alert(
          'Setup sync failed',
          error instanceof Error
            ? `Could not save your bike or emergency info: ${error.message}`
            : 'Could not save your setup data. Please check your connection and try again.',
        );
        throw error;
      }
    },
  });

  return {
    isSyncing: onboardingSyncStatus === 'pending' || onboardingSyncStatus === 'syncing',
    hasPendingDraft: canSyncDraftToUser && (hasBikeDraft || hasEmergencyMinimum),
  };
}

export function useRideListings(userId?: string, options?: QueryToggleOptions) {
  const localListings = useLocalAppStore((state) => state.rideListings);
  const blockedIds = useBlockedUsersStore((state) => state.blockedUserIds);
  const useRemote = Boolean(userId) && isSupabaseConfigured;
  const isEnabled = options?.enabled ?? true;

  const visibleLocal = localListings
    .filter((listing) => !listing.is_reported && !blockedIds.includes(listing.host_user_id))
    .sort((a, b) => new Date(a.ride_date).getTime() - new Date(b.ride_date).getTime());

  const query = useQuery({
    queryKey: ['ride-listings', userId ?? 'local'],
    enabled: useRemote && isEnabled,
    queryFn: async () => {
      if (!supabase || !userId) return visibleLocal;
      const { data, error } = await supabase
        .from('ride_listings')
        .select('*')
        .eq('is_reported', false)
        .order('ride_date', { ascending: true });
      if (error) throw error;
      const remote = data as RideListing[];
      return remote.filter((listing) => !blockedIds.includes(listing.host_user_id));
    },
  });

  if (!useRemote) {
    return { data: visibleLocal, isLoading: false, error: null, isFetching: false };
  }

  return query;
}

export function useBoardFeed(userId?: string) {
  const localListings = useLocalAppStore((state) => state.rideListings);
  const blockedIds = useBlockedUsersStore((state) => state.blockedUserIds);
  const useRemote = Boolean(userId) && isSupabaseConfigured;

  const visibleLocal = localListings
    .filter((listing) => !listing.is_reported && !listing.is_hidden && !blockedIds.includes(listing.host_user_id))
    .sort((a, b) => new Date(a.ride_date).getTime() - new Date(b.ride_date).getTime())
    .map((listing) => ({
      ...listing,
      is_verified_host: Boolean(listing.is_verified_host),
      rsvp_going_count: listing.rsvp_going_count ?? 0,
      rsvp_maybe_count: listing.rsvp_maybe_count ?? 0,
    })) as RideListingFeedRow[];

  const query = useQuery({
    queryKey: ['board-feed', userId ?? 'local'],
    enabled: useRemote,
    queryFn: async () => {
      if (!supabase || !userId) return visibleLocal;
      const { data, error } = await (supabase as any)
        .from('ride_listings_feed')
        .select('*')
        .order('ride_date', { ascending: true });
      if (error) throw error;
      return ((data ?? []) as RideListingFeedRow[]).filter((listing) => !blockedIds.includes(listing.host_user_id));
    },
  });

  if (!useRemote) {
    return { data: visibleLocal, isLoading: false, error: null, isFetching: false };
  }

  return query;
}

export function useBoardMutations(userId?: string) {
  const queryClient = useQueryClient();
  const addRideListingLocal = useLocalAppStore((state) => state.addRideListing);
  const updateRideListingLocal = useLocalAppStore((state) => state.updateRideListing);
  const deleteRideListingLocal = useLocalAppStore((state) => state.deleteRideListing);
  const reportRideListingLocal = useLocalAppStore((state) => state.reportRideListing);

  const createRideListing = useMutation({
    mutationFn: async (listing: Omit<RideListing, 'id' | 'created_at' | 'is_reported' | 'display_name'> & { display_name: string }) => {
      if (supabase && userId) {
        const { data, error } = await supabase
          .from('ride_listings')
          .insert({
            host_user_id: userId,
            title: listing.title ?? null,
            meetup_point: listing.meetup_point,
            meetup_coordinates: listing.meetup_coordinates ?? null,
            destination: listing.destination,
            ride_date: listing.ride_date,
            pace: listing.pace,
            lobby_platform: listing.lobby_platform ?? 'messenger',
            lobby_link: listing.lobby_link ?? null,
            display_name: listing.display_name,
            city: listing.city ?? null,
            photo_urls: listing.photo_urls ?? [],
          } as any)
          .select()
          .single();
        if (error) throw error;
        const savedListing = data as RideListing;
        addRideListingLocal(savedListing);
        return savedListing;
      }

      const localListing: RideListing = {
        ...listing,
        id: createId(),
        host_user_id: userId ?? 'local',
        is_reported: false,
        created_at: new Date().toISOString(),
      };
      addRideListingLocal(localListing);
      return localListing;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['ride-listings', userId ?? 'local'] });
      await queryClient.invalidateQueries({ queryKey: ['board-feed', userId ?? 'local'] });
    },
  });

  const updateRideListing = useMutation({
    mutationFn: async (listing: RideListing) => {
      if (supabase && userId) {
        const { data, error } = await (supabase as any)
          .from('ride_listings')
          .update({
            title: listing.title ?? null,
            meetup_point: listing.meetup_point,
            meetup_coordinates: listing.meetup_coordinates ?? null,
            destination: listing.destination,
            ride_date: listing.ride_date,
            pace: listing.pace,
            lobby_platform: listing.lobby_platform ?? 'messenger',
            lobby_link: listing.lobby_link ?? null,
            city: listing.city ?? null,
            photo_urls: listing.photo_urls ?? [],
          })
          .eq('id', listing.id)
          .eq('host_user_id', userId)
          .select('*')
          .single();
        if (error) throw error;
        const savedListing = data as RideListing;
        updateRideListingLocal(savedListing);
        return savedListing;
      }

      updateRideListingLocal(listing);
      return listing;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['ride-listings', userId ?? 'local'] });
      await queryClient.invalidateQueries({ queryKey: ['board-feed', userId ?? 'local'] });
    },
  });

  const deleteRideListing = useMutation({
    mutationFn: async (listingId: string) => {
      deleteRideListingLocal(listingId);
      if (supabase) {
        await supabase.from('ride_listings').delete().eq('id', listingId);
      }
      return listingId;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['ride-listings', userId ?? 'local'] });
      await queryClient.invalidateQueries({ queryKey: ['board-feed', userId ?? 'local'] });
    },
  });

  const reportRideListing = useMutation({
    mutationFn: async (listingId: string) => {
      reportRideListingLocal(listingId);
      if (supabase) {
        const client = supabase as any;
        await client.rpc('report_ride_listing', { listing_id: listingId });
      }
      return listingId;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['ride-listings', userId ?? 'local'] });
      await queryClient.invalidateQueries({ queryKey: ['board-feed', userId ?? 'local'] });
    },
  });

  return { createRideListing, updateRideListing, deleteRideListing, reportRideListing };
}


// ─────────────────────────────────────────────────────────────────────────────
// Earnings (Work Mode)
// ─────────────────────────────────────────────────────────────────────────────

export function useEarnings(userId?: string) {
  const useRemote = useRemoteMode(userId);

  const query = useQuery({
    queryKey: ['earnings', userId ?? 'local'],
    enabled: useRemote,
    queryFn: async () => {
      if (!supabase || !userId) return [] as import('@/types/domain').RideEarnings[];
      const { data, error } = await (supabase as any)
        .from('ride_earnings')
        .select('*')
        .eq('user_id', userId)
        .order('earned_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as import('@/types/domain').RideEarnings[];
    },
  });

  if (!useRemote) {
    return { data: [] as import('@/types/domain').RideEarnings[], isLoading: false, error: null, isFetching: false };
  }
  return query;
}

export function useEarningsMutations(userId?: string) {
  const client = useQueryClient();

  const saveEarnings = useMutation({
    mutationFn: async (payload: Omit<import('@/types/domain').RideEarnings, 'id' | 'created_at'>) => {
      if (supabase && userId) {
        const { data, error } = await (supabase as any)
          .from('ride_earnings')
          .insert({ ...payload, user_id: userId })
          .select('*')
          .single();
        if (error) throw error;
        return data as import('@/types/domain').RideEarnings;
      }
      return { ...payload, id: createId(), created_at: new Date().toISOString() } as import('@/types/domain').RideEarnings;
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['earnings', userId ?? 'local'] });
      await client.invalidateQueries({ queryKey: ['ride-dashboard-metrics', userId ?? 'local'] });
    },
  });

  return { saveEarnings };
}

export function useRideDashboardMetrics(userId?: string, options?: QueryToggleOptions) {
  const localRides = useLocalAppStore((state) => state.rides);
  const localFuelLogs = useLocalAppStore((state) => state.fuelLogs);
  const localTasks = useLocalAppStore((state) => state.maintenanceTasks);
  const useRemote = useRemoteMode(userId);
  const isEnabled = options?.enabled ?? true;
  const localMetrics = useMemo(
    () => buildLocalRideDashboardMetrics(localRides, localFuelLogs, localTasks),
    [localFuelLogs, localRides, localTasks],
  );

  const normalizeMetrics = (metrics: Partial<RideDashboardMetrics> | null | undefined): RideDashboardMetrics => ({
    latest_ride_id: metrics?.latest_ride_id ?? null,
    latest_ride_distance_km: Number(metrics?.latest_ride_distance_km ?? 0),
    latest_ride_max_speed_kmh: Number(metrics?.latest_ride_max_speed_kmh ?? 0),
    latest_ride_fuel_used_liters: Number(metrics?.latest_ride_fuel_used_liters ?? 0),
    latest_ride_started_at: metrics?.latest_ride_started_at ?? null,
    latest_fuel_price: Number(metrics?.latest_fuel_price ?? 65),
    today_earnings: Number(metrics?.today_earnings ?? 0),
    today_fuel_cost: Number(metrics?.today_fuel_cost ?? 0),
    today_trip_count: Number(metrics?.today_trip_count ?? 0),
    month_distance_km: Number(metrics?.month_distance_km ?? 0),
    month_fuel_cost: Number(metrics?.month_fuel_cost ?? 0),
    month_maintenance_accrual: Number(metrics?.month_maintenance_accrual ?? 0),
    month_total_cost: Number(metrics?.month_total_cost ?? 0),
    month_cost_per_km: Number(metrics?.month_cost_per_km ?? 0),
  });

  const query = useQuery({
    queryKey: ['ride-dashboard-metrics', userId ?? 'local'],
    enabled: useRemote && isEnabled,
    queryFn: async () => {
      if (!supabase || !userId) {
        return localMetrics;
      }

      const { data, error } = await (supabase as any).rpc('ride_dashboard_metrics', { p_user_id: userId });
      if (error) throw error;
      const row = (data?.[0] ?? null) as RideDashboardMetrics | null;
      return row ? normalizeMetrics(row) : localMetrics;
    },
    staleTime: 90_000,
    gcTime: 10 * 60_000,
  });

  if (!useRemote) {
    return { data: localMetrics, isLoading: false, error: null, isFetching: false };
  }

  return query;
}

// ─────────────────────────────────────────────────────────────────────────────
// Maintenance tasks across every bike the user owns (for amortization totals)
// ─────────────────────────────────────────────────────────────────────────────

export function useMaintenanceTasksAllBikes(userId?: string) {
  const localTasks = useLocalAppStore((state) => state.maintenanceTasks);
  const useRemote = useRemoteMode(userId);

  const query = useQuery({
    queryKey: ['maintenance-all', userId ?? 'local'],
    enabled: useRemote,
    queryFn: async () => {
      if (!supabase || !userId) return localTasks;
      const { data: bikeRows, error: bikeErr } = await supabase.from('bikes').select('id').eq('user_id', userId);
      if (bikeErr) throw bikeErr;
      const bikeIds = (bikeRows ?? []).map((b: any) => b.id);
      if (!bikeIds.length) return [] as MaintenanceTask[];
      const { data, error } = await supabase.from('maintenance_tasks').select('*').in('bike_id', bikeIds);
      if (error) throw error;
      return (data ?? []) as MaintenanceTask[];
    },
  });

  if (!useRemote) {
    return { data: localTasks, isLoading: false, error: null, isFetching: false };
  }
  return query;
}

export function useMaintenanceOverview(userId?: string) {
  const localTasks = useLocalAppStore((state) => state.maintenanceTasks);
  const localBikes = useLocalAppStore((state) => state.bikes);
  const useRemote = useRemoteMode(userId);

  const query = useQuery({
    queryKey: ['maintenance-overview', userId ?? 'local'],
    enabled: useRemote,
    queryFn: async () => {
      if (!supabase || !userId) {
        return localTasks.map((task) => {
          const bike = localBikes.find((item) => item.id === task.bike_id);
          return {
            ...task,
            bike_make: bike?.make ?? '',
            bike_model: bike?.model ?? '',
            bike_nickname: bike?.nickname ?? null,
            current_odometer_km: bike?.current_odometer_km ?? 0,
            bike_created_at: bike?.created_at ?? null,
          };
        });
      }

      const { data, error } = await (supabase as any).rpc('user_maintenance_overview', { p_user_id: userId });
      if (error) throw error;
      return (data ?? []) as (MaintenanceTask & {
        bike_make: string;
        bike_model: string;
        bike_nickname: string | null;
        current_odometer_km: number;
        bike_created_at: string | null;
      })[];
    },
  });

  if (!useRemote) {
    return { data: query.data ?? [], isLoading: false, error: null, isFetching: false };
  }

  return query;
}

// ─────────────────────────────────────────────────────────────────────────────
// Lobby RSVPs
// ─────────────────────────────────────────────────────────────────────────────

export function useRideListingRsvps(listingId?: string) {
  const useRemote = isSupabaseConfigured && Boolean(listingId);

  const query = useQuery({
    queryKey: ['ride-listing-rsvps', listingId ?? 'none'],
    enabled: useRemote,
    queryFn: async () => {
      if (!supabase || !listingId) return [] as import('@/types/domain').RideRSVP[];
      const { data, error } = await (supabase as any)
        .from('ride_listing_rsvps')
        .select('*')
        .eq('listing_id', listingId);
      if (error) throw error;
      return (data ?? []) as import('@/types/domain').RideRSVP[];
    },
  });

  if (!useRemote) {
    return { data: [] as import('@/types/domain').RideRSVP[], isLoading: false, error: null, isFetching: false };
  }
  return query;
}

export function useMyRideListingRsvps(userId?: string) {
  const useRemote = isSupabaseConfigured && Boolean(userId);

  const query = useQuery({
    queryKey: ['my-ride-listing-rsvps', userId ?? 'none'],
    enabled: useRemote,
    queryFn: async () => {
      if (!supabase || !userId) return [] as import('@/types/domain').RideRSVP[];
      const { data, error } = await (supabase as any)
        .from('ride_listing_rsvps')
        .select('*')
        .eq('user_id', userId);
      if (error) throw error;
      return (data ?? []) as import('@/types/domain').RideRSVP[];
    },
    staleTime: 60_000,
  });

  if (!useRemote) {
    return { data: [] as import('@/types/domain').RideRSVP[], isLoading: false, error: null, isFetching: false };
  }

  return query;
}

export function useRsvpMutations(userId?: string) {
  const client = useQueryClient();

  const setRsvp = useMutation({
    mutationFn: async ({
      listingId,
      status,
      displayName,
    }: {
      listingId: string;
      status: import('@/types/domain').RSVPStatus;
      displayName: string;
    }) => {
      if (!supabase || !userId) throw new Error('Sign in to RSVP.');
      const { data, error } = await (supabase as any)
        .from('ride_listing_rsvps')
        .upsert(
          { listing_id: listingId, user_id: userId, status, display_name: displayName },
          { onConflict: 'listing_id,user_id' },
        )
        .select('*')
        .single();
      if (error) throw error;
      return data as import('@/types/domain').RideRSVP;
    },
    onSuccess: async (_, variables) => {
      await client.invalidateQueries({ queryKey: ['ride-listing-rsvps', variables.listingId] });
      await client.invalidateQueries({ queryKey: ['ride-listings', userId ?? 'local'] });
      await client.invalidateQueries({ queryKey: ['board-feed', userId ?? 'local'] });
    },
  });

  const cancelRsvp = useMutation({
    mutationFn: async (listingId: string) => {
      if (!supabase || !userId) throw new Error('Sign in to cancel RSVP.');
      const { error } = await (supabase as any)
        .from('ride_listing_rsvps')
        .delete()
        .eq('listing_id', listingId)
        .eq('user_id', userId);
      if (error) throw error;
      return listingId;
    },
    onSuccess: async (listingId) => {
      await client.invalidateQueries({ queryKey: ['ride-listing-rsvps', listingId] });
      await client.invalidateQueries({ queryKey: ['ride-listings', userId ?? 'local'] });
      await client.invalidateQueries({ queryKey: ['board-feed', userId ?? 'local'] });
    },
  });

  return { setRsvp, cancelRsvp };
}

// ─────────────────────────────────────────────────────────────────────────────
// Weekly referral leaderboard
// ─────────────────────────────────────────────────────────────────────────────

export type WeeklyReferralLeader = {
  referrer_user_id: string;
  display_name: string;
  referral_count: number;
  is_verified_host?: boolean | null;
};

export function useWeeklyReferralLeaderboard() {
  const useRemote = isSupabaseConfigured;

  const query = useQuery({
    queryKey: ['referral-leaderboard', 'week'],
    enabled: useRemote,
    queryFn: async () => {
      if (!supabase) return [] as WeeklyReferralLeader[];
      // Uses view `weekly_referral_leaderboard` if present, else falls back to client-side aggregation.
      const client = supabase as any;
      const { data, error } = await client
        .from('weekly_referral_leaderboard')
        .select('*')
        .limit(20);
      if (error || !data) {
        // Fallback: aggregate from referrals table
        const start = new Date();
        const day = start.getDay();
        start.setDate(start.getDate() - day);
        start.setHours(0, 0, 0, 0);
        const { data: referrals, error: rErr } = await client
          .from('referrals')
          .select('*, profiles:referrer_user_id(display_name,is_verified_host)')
          .gte('rewarded_at', start.toISOString())
          .eq('status', 'rewarded');
        if (rErr) return [] as WeeklyReferralLeader[];
        const counts = new Map<string, WeeklyReferralLeader>();
        for (const r of (referrals ?? []) as any[]) {
          const key = r.referrer_user_id as string;
          const existing = counts.get(key);
          const name = r.profiles?.display_name ?? 'Kurbada Rider';
          if (existing) {
            existing.referral_count += 1;
          } else {
            counts.set(key, {
              referrer_user_id: key,
              display_name: name,
              referral_count: 1,
              is_verified_host: r.profiles?.is_verified_host ?? false,
            });
          }
        }
        return Array.from(counts.values()).sort((a, b) => b.referral_count - a.referral_count);
      }
      return (data ?? []) as WeeklyReferralLeader[];
    },
  });

  if (!useRemote) {
    return { data: [] as WeeklyReferralLeader[], isLoading: false, error: null, isFetching: false };
  }
  return query;
}


// ─────────────────────────────────────────────────────────────────────────────
// Gear tracker
// ─────────────────────────────────────────────────────────────────────────────

export function useGearItems(userId?: string) {
  const useRemote = useRemoteMode(userId);

  const query = useQuery({
    queryKey: ['gear-items', userId ?? 'local'],
    enabled: useRemote,
    queryFn: async () => {
      if (!supabase || !userId) return [] as import('@/types/domain').GearItem[];
      const { data, error } = await (supabase as any)
        .from('gear_items')
        .select('*')
        .eq('user_id', userId)
        .eq('archived', false)
        .order('install_date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as import('@/types/domain').GearItem[];
    },
  });

  if (!useRemote) {
    return {
      data: [] as import('@/types/domain').GearItem[],
      isLoading: false,
      error: null,
      isFetching: false,
    };
  }
  return query;
}

export function useGearMutations(userId?: string) {
  const client = useQueryClient();

  const saveGearItem = useMutation({
    mutationFn: async (payload: Omit<import('@/types/domain').GearItem, 'id' | 'created_at' | 'user_id'> & { id?: string }) => {
      if (!supabase || !userId) throw new Error('Sign in to save gear.');
      if (payload.id) {
        const { data, error } = await (supabase as any)
          .from('gear_items')
          .update({
            bike_id: payload.bike_id ?? null,
            name: payload.name,
            category: payload.category,
            install_date: payload.install_date,
            install_odometer_km: payload.install_odometer_km ?? null,
            expected_lifetime_months: payload.expected_lifetime_months ?? null,
            expected_lifetime_km: payload.expected_lifetime_km ?? null,
            notes: payload.notes ?? null,
            archived: payload.archived ?? false,
          })
          .eq('id', payload.id)
          .eq('user_id', userId)
          .select('*')
          .single();
        if (error) throw error;
        return data as import('@/types/domain').GearItem;
      }
      const { data, error } = await (supabase as any)
        .from('gear_items')
        .insert({ ...payload, user_id: userId })
        .select('*')
        .single();
      if (error) throw error;
      return data as import('@/types/domain').GearItem;
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['gear-items', userId ?? 'local'] });
    },
  });

  const deleteGearItem = useMutation({
    mutationFn: async (id: string) => {
      if (!supabase || !userId) throw new Error('Sign in to delete gear.');
      const { error } = await (supabase as any).from('gear_items').delete().eq('id', id).eq('user_id', userId);
      if (error) throw error;
      return id;
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['gear-items', userId ?? 'local'] });
    },
  });

  return { saveGearItem, deleteGearItem };
}
