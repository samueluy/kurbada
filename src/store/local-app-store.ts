import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { sampleBikes, sampleEmergencyInfo, sampleFuelLogs, sampleMaintenanceTasks, sampleProfile, sampleReferrals, sampleRideListings, sampleRides } from '@/lib/mock-data';
import { appStorage } from '@/lib/storage';
import type { Bike, EmergencyInfo, FuelLog, MaintenanceTask, Profile, ReferralRecord, RideListing, RideRecord } from '@/types/domain';

type LocalAppState = {
  profile: Profile;
  bikes: Bike[];
  maintenanceTasks: MaintenanceTask[];
  rides: RideRecord[];
  fuelLogs: FuelLog[];
  emergencyInfo: EmergencyInfo;
  referrals: ReferralRecord[];
  rideListings: RideListing[];
  updateProfile: (updates: Partial<Profile>) => void;
  upsertBike: (bike: Bike) => void;
  deleteBike: (bikeId: string) => void;
  saveRide: (ride: RideRecord) => void;
  saveFuelLog: (fuelLog: FuelLog) => void;
  deleteFuelLog: (fuelLogId: string) => void;
  updateEmergencyInfo: (info: EmergencyInfo) => void;
  upsertReferral: (referral: ReferralRecord) => void;
  markReferralNotified: (referralId: string, notifiedAt?: string) => void;
  addMaintenanceTasks: (tasks: MaintenanceTask[]) => void;
  addMaintenanceTask: (task: MaintenanceTask) => void;
  updateMaintenanceTask: (task: MaintenanceTask) => void;
  deleteMaintenanceTask: (taskId: string) => void;
  addRideListing: (listing: RideListing) => void;
  deleteRideListing: (listingId: string) => void;
  reportRideListing: (listingId: string) => void;
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
      referrals: sampleReferrals,
      updateProfile: (updates) =>
        set((state) => ({
          profile: { ...state.profile, ...updates },
        })),
      upsertBike: (bike) =>
        set((state) => ({
          bikes: state.bikes.some((item) => item.id === bike.id)
            ? state.bikes.map((item) => (item.id === bike.id ? bike : item))
            : [bike, ...state.bikes],
        })),
      deleteBike: (bikeId) =>
        set((state) => ({
          bikes: state.bikes.filter((item) => item.id !== bikeId),
          maintenanceTasks: state.maintenanceTasks.filter((item) => item.bike_id !== bikeId),
          rides: state.rides.filter((item) => item.bike_id !== bikeId),
          fuelLogs: state.fuelLogs.filter((item) => item.bike_id !== bikeId),
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
      upsertReferral: (referral) =>
        set((state) => ({
          referrals: state.referrals.some((item) => item.id === referral.id)
            ? state.referrals.map((item) => (item.id === referral.id ? referral : item))
            : [referral, ...state.referrals],
        })),
      markReferralNotified: (referralId, notifiedAt = new Date().toISOString()) =>
        set((state) => ({
          referrals: state.referrals.map((item) =>
            item.id === referralId ? { ...item, notified_at: notifiedAt } : item,
          ),
        })),
      rideListings: sampleRideListings,
      addRideListing: (listing) =>
        set((state) => ({
          rideListings: [listing, ...state.rideListings],
        })),
      deleteRideListing: (listingId) =>
        set((state) => ({
          rideListings: state.rideListings.filter((item) => item.id !== listingId),
        })),
      reportRideListing: (listingId) =>
        set((state) => ({
          rideListings: state.rideListings.map((item) =>
            item.id === listingId ? { ...item, is_reported: true } : item,
          ),
        })),
      addMaintenanceTasks: (tasks: MaintenanceTask[]) =>
        set((state) => ({
          maintenanceTasks: [...tasks, ...state.maintenanceTasks],
        })),
      addMaintenanceTask: (task: MaintenanceTask) =>
        set((state) => ({
          maintenanceTasks: [task, ...state.maintenanceTasks],
        })),
      updateMaintenanceTask: (task: MaintenanceTask) =>
        set((state) => ({
          maintenanceTasks: state.maintenanceTasks.map((item) => (item.id === task.id ? task : item)),
        })),
      deleteMaintenanceTask: (taskId: string) =>
        set((state) => ({
          maintenanceTasks: state.maintenanceTasks.filter((item) => item.id !== taskId),
        })),
    }),
    {
      name: 'kurbada-local-data',
      storage: createJSONStorage(() => appStorage),
    },
  ),
);
