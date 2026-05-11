import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Alert } from 'react-native';

import { createId } from '@/lib/id';
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
import type { Bike, EmergencyInfo, FuelLog, MaintenancePresetKey, MaintenanceTask, Profile, ReferralRecord, RideListing, RideRecord } from '@/types/domain';

function toMaintenanceTemplates(keys: MaintenancePresetKey[], category: Bike['category']) {
  const fallbackKeys = keys.length ? keys : getDefaultMaintenancePresets(category);
  return fallbackKeys.map((key) => {
    const preset = maintenancePresetCatalog[key];
    return {
      task_name: preset.taskName,
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

export function useRides(userId?: string) {
  const localRides = useLocalAppStore((state) => state.rides);
  const useRemote = useRemoteMode(userId);

  const query = useQuery({
    queryKey: ['rides', userId ?? 'local'],
    enabled: useRemote,
    queryFn: async () => {
      if (!supabase || !userId) return localRides;
      const { data, error } = await supabase.from('rides').select('*').eq('user_id', userId).order('started_at', { ascending: false });
      if (error) throw error;
      return data as unknown as RideRecord[];
    },
  });

  if (!useRemote) {
    return { data: localRides, isLoading: false, error: null, isFetching: false };
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
      const { data, error } = await supabase.from('emergency_info').select('*').eq('user_id', userId).maybeSingle();
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

  const saveBike = useMutation({
    mutationFn: async (bike: Bike & { maintenancePresetKeys?: MaintenancePresetKey[] }) => {
      if (supabase && userId) {
        const payload = {
          make: bike.make,
          model: bike.model,
          year: bike.year,
          engine_cc: bike.engine_cc,
          current_odometer_km: bike.current_odometer_km,
          category: bike.category,
          mount_profile_id: bike.mount_profile_id ?? null,
          user_id: userId,
        };

        const builder = bike.id
          ? supabase.from('bikes').upsert({ ...payload, id: bike.id } as any, { onConflict: 'id' })
          : supabase.from('bikes').insert(payload as any);

        const { data, error } = await builder.select().single();
        if (error) throw error;

        const savedBike = data as Bike;
        upsertBikeLocal(savedBike);
        await reconcileMaintenanceTemplates({
          bikeId: savedBike.id,
          category: savedBike.category,
          currentOdometerKm: savedBike.current_odometer_km,
          selectedPresetKeys: bike.maintenancePresetKeys ?? [],
          userId,
          setMaintenanceTasksForBike,
        });
        return savedBike;
      }

      const localBike = { ...bike, id: bike.id || createId() };
      upsertBikeLocal(localBike);
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
    },
  });

  return { saveBike, deleteBike };
}

export function useRideMutations(userId?: string) {
  const queryClient = useQueryClient();
  const saveRideLocal = useLocalAppStore((state) => state.saveRide);

  const saveRide = useMutation({
    mutationFn: async (ride: RideRecord) => {
      if (supabase && userId) {
        const payload = {
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
          route_point_count_raw: ride.route_point_count_raw,
          route_point_count_simplified: ride.route_point_count_simplified,
          route_bounds: ride.route_bounds,
        };

        const { data, error } = await supabase.from('rides').insert(payload as any).select().single();
        if (error) throw error;

        const savedRide = data as unknown as RideRecord;
        saveRideLocal(savedRide);
        return savedRide;
      }

      saveRideLocal(ride);
      return ride;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['rides', userId ?? 'local'] });
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['rides', userId ?? 'local'] });
    },
  });

  return { saveRide, updateRideMood };
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
    },
  });

  return { saveFuelLog, deleteFuelLog };
}

export function useMaintenanceMutations(userId?: string) {
  const queryClient = useQueryClient();
  const addMaintenanceTaskLocal = useLocalAppStore((state) => state.addMaintenanceTask);
  const updateMaintenanceTaskLocal = useLocalAppStore((state) => state.updateMaintenanceTask);
  const deleteMaintenanceTaskLocal = useLocalAppStore((state) => state.deleteMaintenanceTask);

  const addMaintenanceTask = useMutation<MaintenanceTask, Error, Omit<MaintenanceTask, 'id'> & { id?: string }>({
    mutationFn: async (task: Omit<MaintenanceTask, 'id'> & { id?: string }) => {
      const newTask = { ...task, id: task.id || createId() } as MaintenanceTask;

      if (supabase && userId) {
        const { data, error } = await supabase
          .from('maintenance_tasks')
            .insert({
              bike_id: newTask.bike_id,
              task_name: newTask.task_name,
              interval_km: newTask.interval_km,
              interval_days: newTask.interval_days ?? null,
              last_done_odometer_km: newTask.last_done_odometer_km,
              last_done_date: newTask.last_done_date,
            } as any)
          .select()
          .single();
        if (error) throw error;
        addMaintenanceTaskLocal(data as MaintenanceTask);
        return data as MaintenanceTask;
      }

      addMaintenanceTaskLocal(newTask);
      return newTask;
    },
    onSuccess: async (task) => {
      await queryClient.invalidateQueries({ queryKey: ['maintenance', task.bike_id] });
    },
  });

  const updateMaintenanceTask = useMutation({
    mutationFn: async (task: MaintenanceTask) => {
      updateMaintenanceTaskLocal(task);

      if (supabase) {
        const client = supabase as any;
        await client.from('maintenance_tasks').update({
          last_done_odometer_km: task.last_done_odometer_km,
          last_done_date: task.last_done_date,
        }).eq('id', task.id);
      }

      return task;
    },
    onSuccess: async (task) => {
      await queryClient.invalidateQueries({ queryKey: ['maintenance', task.bike_id] });
    },
  });

  const deleteMaintenanceTask = useMutation({
    mutationFn: async (taskId: string) => {
      deleteMaintenanceTaskLocal(taskId);
      if (supabase) {
        await supabase.from('maintenance_tasks').delete().eq('id', taskId);
      }
      return taskId;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['maintenance', userId ?? 'local'] });
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

        const builder = info.id
          ? supabase.from('emergency_info').upsert({ ...payload, id: info.id } as any, { onConflict: 'id' })
          : supabase.from('emergency_info').insert(payload as any);

        const { data, error } = await builder.select().single();
        if (error) throw error;
        const savedInfo = data as EmergencyInfo;
        updateEmergencyInfoLocal(savedInfo);
        return savedInfo;
      }

      const localInfo = { ...info, id: info.id || createId() };
      updateEmergencyInfoLocal(localInfo);
      return localInfo;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['emergency', userId ?? 'local'] });
    },
  });

  return { saveEmergencyInfo };
}

export function useOnboardingSync(userId?: string) {
  const onboardingData = useAppStore((state) => state.onboardingData);
  const onboardingSyncStatus = useAppStore((state) => state.onboardingSyncStatus);
  const onboardingSyncedUserId = useAppStore((state) => state.onboardingSyncedUserId);
  const markOnboardingSyncing = useAppStore((state) => state.markOnboardingSyncing);
  const markOnboardingSyncComplete = useAppStore((state) => state.markOnboardingSyncComplete);
  const markOnboardingSyncFailed = useAppStore((state) => state.markOnboardingSyncFailed);
  const resetOnboardingSyncStatus = useAppStore((state) => state.resetOnboardingSyncStatus);
  const completeBikeSetup = useAppStore((state) => state.completeBikeSetup);
  const bikes = useBikes(userId);
  const emergency = useEmergencyInfo(userId);
  const { saveBike } = useBikeMutations(userId);
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

  const localKey = userId ?? 'local';
  const hasBikeDraft = Boolean(
    bikeBrand
      && bikeModel
      && bikeYear
      && bikeEngineCc
      && bikeOdometerKm,
  );
  const hasEmergencyMinimum = Boolean(
    fullName
      && emergencyContactName
      && emergencyContactPhone,
  );

  const needsSync =
    onboardingSyncStatus !== 'completed'
    || onboardingSyncedUserId !== localKey;

  // Reset stale sync status when the user context changes (e.g., after fresh sign-up)
  useEffect(() => {
    if (
      onboardingSyncStatus === 'failed'
      || (onboardingSyncStatus === 'completed' && onboardingSyncedUserId !== localKey)
    ) {
      resetOnboardingSyncStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localKey]);

  useQuery({
    queryKey: ['onboarding-sync', localKey, onboardingSyncStatus, onboardingSyncedUserId, onboardingData],
    enabled:
      needsSync
      && onboardingSyncStatus !== 'syncing'
      && (hasBikeDraft || hasEmergencyMinimum)
      && !bikes.isLoading
      && !emergency.isLoading,
    retry: false,
    queryFn: async () => {
      markOnboardingSyncing();

      let syncedBikeId: string | null = null;
      let syncedEmergencyId: string | null = null;

      try {
        if (hasBikeDraft) {
          const existingBike = bikes.data?.find(
            (item) =>
              item.make.toLowerCase() === bikeBrand.toLowerCase()
              && item.model.toLowerCase() === bikeModel.toLowerCase()
              && item.year === Number(bikeYear),
          );

          const bike = await saveBike.mutateAsync({
            id: existingBike?.id ?? '',
            make: bikeBrand,
            model: bikeModel,
            year: Number(bikeYear),
            engine_cc: Number(bikeEngineCc),
            current_odometer_km: Number(bikeOdometerKm),
            category: onboardingData.bikeCategory,
            maintenancePresetKeys: onboardingData.maintenancePresetKeys,
          });

          syncedBikeId = bike.id;
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
        }

        markOnboardingSyncComplete({
          userId: localKey,
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
        console.warn('Onboarding sync failed:', error);
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
    hasPendingDraft: hasBikeDraft || hasEmergencyMinimum,
  };
}

export function useRideListings(userId?: string) {
  const localListings = useLocalAppStore((state) => state.rideListings);
  const blockedIds = useBlockedUsersStore((state) => state.blockedUserIds);
  const useRemote = Boolean(userId) && isSupabaseConfigured;

  const visibleLocal = localListings
    .filter((listing) => !listing.is_reported && !blockedIds.includes(listing.host_user_id))
    .sort((a, b) => new Date(a.ride_date).getTime() - new Date(b.ride_date).getTime());

  const query = useQuery({
    queryKey: ['ride-listings', userId ?? 'local'],
    enabled: useRemote,
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

export function useBoardMutations(userId?: string) {
  const queryClient = useQueryClient();
  const addRideListingLocal = useLocalAppStore((state) => state.addRideListing);
  const deleteRideListingLocal = useLocalAppStore((state) => state.deleteRideListing);
  const reportRideListingLocal = useLocalAppStore((state) => state.reportRideListing);

  const createRideListing = useMutation({
    mutationFn: async (listing: Omit<RideListing, 'id' | 'created_at' | 'is_reported' | 'display_name'> & { display_name: string }) => {
      if (supabase && userId) {
        const { data, error } = await supabase
          .from('ride_listings')
          .insert({
            host_user_id: userId,
            meetup_point: listing.meetup_point,
            meetup_coordinates: listing.meetup_coordinates ?? null,
            destination: listing.destination,
            ride_date: listing.ride_date,
            pace: listing.pace,
            lobby_link: listing.lobby_link,
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
    },
  });

  return { createRideListing, deleteRideListing, reportRideListing };
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
    },
  });

  return { saveEarnings };
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
