import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { sampleBikes, sampleEmergencyInfo, sampleFuelLogs, sampleMaintenanceTasks, sampleProfile, sampleRides } from '@/lib/mock-data';
import { appStorage } from '@/lib/storage';
import type { Bike, EmergencyInfo, FuelLog, MaintenanceTask, Profile, RideRecord } from '@/types/domain';

type LocalAppState = {
  profile: Profile;
  bikes: Bike[];
  maintenanceTasks: MaintenanceTask[];
  rides: RideRecord[];
  fuelLogs: FuelLog[];
  emergencyInfo: EmergencyInfo;
  upsertBike: (bike: Bike) => void;
  saveRide: (ride: RideRecord) => void;
  saveFuelLog: (fuelLog: FuelLog) => void;
  deleteFuelLog: (fuelLogId: string) => void;
  updateEmergencyInfo: (info: EmergencyInfo) => void;
  addMaintenanceTasks: (tasks: MaintenanceTask[]) => void;
};

export const useLocalAppStore = create<LocalAppState>()(
  persist(
    (set) => ({
      profile: sampleProfile,
      bikes: sampleBikes,
      maintenanceTasks: sampleMaintenanceTasks,
      rides: sampleRides,
      fuelLogs: sampleFuelLogs,
      emergencyInfo: sampleEmergencyInfo,
      upsertBike: (bike) =>
        set((state) => ({
          bikes: state.bikes.some((item) => item.id === bike.id)
            ? state.bikes.map((item) => (item.id === bike.id ? bike : item))
            : [bike, ...state.bikes],
        })),
      saveRide: (ride) => set((state) => ({ rides: [ride, ...state.rides] })),
      saveFuelLog: (fuelLog) =>
        set((state) => ({
          fuelLogs: state.fuelLogs.some((item) => item.id === fuelLog.id)
            ? state.fuelLogs.map((item) => (item.id === fuelLog.id ? fuelLog : item))
            : [fuelLog, ...state.fuelLogs],
        })),
      deleteFuelLog: (fuelLogId) =>
        set((state) => ({
          fuelLogs: state.fuelLogs.filter((item) => item.id !== fuelLogId),
        })),
      updateEmergencyInfo: (emergencyInfo) => set({ emergencyInfo }),
      addMaintenanceTasks: (tasks: MaintenanceTask[]) =>
        set((state) => ({
          maintenanceTasks: [...tasks, ...state.maintenanceTasks],
        })),
    }),
    {
      name: 'kurbada-local-data',
      storage: createJSONStorage(() => appStorage),
    },
  ),
);
