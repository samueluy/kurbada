import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { createId } from '@/lib/id';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useLocalAppStore } from '@/store/local-app-store';
import type { Bike, EmergencyInfo, FuelLog, MaintenanceTask, RideRecord } from '@/types/domain';

const defaultMaintenanceTemplates: Omit<MaintenanceTask, 'id' | 'bike_id' | 'last_done_odometer_km' | 'last_done_date'>[] = [
  { task_name: 'Engine Oil Change', interval_km: 3000 },
  { task_name: 'Chain Tension & Lube', interval_km: 600 },
  { task_name: 'Brake Fluid', interval_km: 12000 },
  { task_name: 'Air Filter', interval_km: 9000 },
  { task_name: 'Spark Plugs', interval_km: 12000 },
  { task_name: 'Coolant', interval_km: 18000 },
  { task_name: 'Tire Pressure reminder', interval_km: 200 },
];

export function useBikes(userId?: string) {
  const bikes = useLocalAppStore((state) => state.bikes);
  const useRemote = Boolean(userId) && isSupabaseConfigured;

  return useQuery({
    queryKey: ['bikes', userId ?? 'local'],
    enabled: useRemote,
    queryFn: async () => {
      if (!supabase || !userId) {
        return bikes;
      }

      const { data, error } = await supabase.from('bikes').select('*').eq('user_id', userId).order('created_at', { ascending: false });
      if (error) {
        throw error;
      }
      return data as Bike[];
    },
    initialData: useRemote ? undefined : bikes,
  });
}

export function useMaintenanceTasks(bikeId?: string) {
  const tasks = useLocalAppStore((state) => state.maintenanceTasks);
  const useRemote = Boolean(bikeId) && isSupabaseConfigured;

  return useQuery({
    queryKey: ['maintenance', bikeId ?? 'local'],
    enabled: useRemote,
    queryFn: async () => {
      if (!supabase || !bikeId) {
        return tasks.filter((task) => task.bike_id === bikeId);
      }

      const { data, error } = await supabase.from('maintenance_tasks').select('*').eq('bike_id', bikeId);
      if (error) {
        throw error;
      }
      return data as MaintenanceTask[];
    },
    initialData: useRemote ? undefined : tasks.filter((task) => task.bike_id === bikeId),
  });
}

export function useRides(userId?: string) {
  const rides = useLocalAppStore((state) => state.rides);
  const useRemote = Boolean(userId) && isSupabaseConfigured;

  return useQuery({
    queryKey: ['rides', userId ?? 'local'],
    enabled: useRemote,
    queryFn: async () => {
      if (!supabase || !userId) {
        return rides;
      }

      const { data, error } = await supabase.from('rides').select('*').eq('user_id', userId).order('started_at', { ascending: false });
      if (error) {
        throw error;
      }
      return data as unknown as RideRecord[];
    },
    initialData: useRemote ? undefined : rides,
  });
}

export function useFuelLogs(userId?: string) {
  const fuelLogs = useLocalAppStore((state) => state.fuelLogs);
  const useRemote = Boolean(userId) && isSupabaseConfigured;

  return useQuery({
    queryKey: ['fuel-logs', userId ?? 'local'],
    enabled: useRemote,
    queryFn: async () => {
      if (!supabase || !userId) {
        return fuelLogs;
      }

      const { data, error } = await supabase.from('fuel_logs').select('*').eq('user_id', userId).order('logged_at', { ascending: false });
      if (error) {
        throw error;
      }
      return data as FuelLog[];
    },
    initialData: useRemote ? undefined : fuelLogs,
  });
}

export function useEmergencyInfo(userId?: string) {
  const emergencyInfo = useLocalAppStore((state) => state.emergencyInfo);
  const useRemote = Boolean(userId) && isSupabaseConfigured;

  return useQuery({
    queryKey: ['emergency', userId ?? 'local'],
    enabled: useRemote,
    queryFn: async () => {
      if (!supabase || !userId) {
        return emergencyInfo;
      }

      const { data, error } = await supabase.from('emergency_info').select('*').eq('user_id', userId).maybeSingle();
      if (error) {
        throw error;
      }
      return (data as EmergencyInfo | null) ?? emergencyInfo;
    },
    initialData: useRemote ? undefined : emergencyInfo,
  });
}

export function useBikeMutations(userId?: string) {
  const queryClient = useQueryClient();
  const upsertBikeLocal = useLocalAppStore((state) => state.upsertBike);
  const addMaintenanceTasks = useLocalAppStore((state) => state.addMaintenanceTasks);

  const saveBike = useMutation({
    mutationFn: async (bike: Bike) => {
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
        if (error) {
          throw error;
        }

        const savedBike = data as Bike;
        upsertBikeLocal(savedBike);
        return savedBike;
      }

      const localBike = { ...bike, id: bike.id || createId() };
      upsertBikeLocal(localBike);
      return localBike;
    },
    onSuccess: async (bike) => {
      await queryClient.invalidateQueries({ queryKey: ['bikes', userId ?? 'local'] });

      const existingTasks = queryClient.getQueryData<MaintenanceTask[]>(['maintenance', bike.id]) ?? [];
      if (existingTasks.length) {
        return;
      }

      const baseTasks = defaultMaintenanceTemplates.map((template) => ({
        bike_id: bike.id,
        task_name: template.task_name,
        interval_km: template.interval_km,
        last_done_odometer_km: bike.current_odometer_km,
        last_done_date: new Date().toISOString().slice(0, 10),
      }));

      if (supabase && userId) {
        const { data, error } = await supabase
          .from('maintenance_tasks')
          .insert(baseTasks as any)
          .select();
        if (error) {
          throw error;
        }
        addMaintenanceTasks(data as MaintenanceTask[]);
      } else {
        addMaintenanceTasks(
          baseTasks.map((task) => ({
            ...task,
            id: createId(),
          })) as MaintenanceTask[],
        );
      }

      await queryClient.invalidateQueries({ queryKey: ['maintenance', bike.id] });
    },
  });

  return { saveBike };
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
          route_geojson: ride.route_geojson,
          route_point_count_raw: ride.route_point_count_raw,
          route_point_count_simplified: ride.route_point_count_simplified,
          route_bounds: ride.route_bounds,
        };

        const { data, error } = await supabase.from('rides').insert(payload as any).select().single();
        if (error) {
          throw error;
        }

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

  return { saveRide };
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
        if (error) {
          throw error;
        }
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
        if (error) {
          throw error;
        }
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
