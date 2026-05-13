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
  pendingRides: RideRecord[];
  fuelLogs: FuelLog[];
  emergencyInfo: EmergencyInfo;
  referrals: ReferralRecord[];
  rideListings: RideListing[];
  updateProfile: (updates: Partial<Profile>) => void;
  upsertBike: (bike: Bike) => void;
  deleteBike: (bikeId: string) => void;
  saveRide: (ride: RideRecord) => void;
  deleteRide: (rideId: string) => void;
  addPendingRide: (ride: RideRecord) => void;
  removePendingRide: (rideId: string) => void;
  saveFuelLog: (fuelLog: FuelLog) => void;
  deleteFuelLog: (fuelLogId: string) => void;
  updateEmergencyInfo: (info: EmergencyInfo) => void;
  upsertReferral: (referral: ReferralRecord) => void;
  markReferralNotified: (referralId: string, notifiedAt?: string) => void;
  addMaintenanceTasks: (tasks: MaintenanceTask[]) => void;
  setMaintenanceTasksForBike: (bikeId: string, tasks: MaintenanceTask[]) => void;
  addMaintenanceTask: (task: MaintenanceTask) => void;
  updateMaintenanceTask: (task: MaintenanceTask) => void;
  deleteMaintenanceTask: (taskId: string) => void;
  addRideListing: (listing: RideListing) => void;
  updateRideListing: (listing: RideListing) => void;
  deleteRideListing: (listingId: string) => void;
  reportRideListing: (listingId: string) => void;
  resetLocalStore: () => void;
};

const emptyProfile: Profile = {
  id: '',
  display_name: 'Kurbada Rider',
  subscription_status: 'inactive',
  access_override: 'none',
  referral_code: '',
};

const emptyEmergencyInfo: EmergencyInfo = {
  id: '',
  full_name: '',
  blood_type: '',
  allergies: '',
  conditions: '',
  contact1_name: '',
  contact1_phone: '',
  contact2_name: '',
  contact2_phone: '',
};

const LOCAL_APP_STORE_VERSION = 3;

const initialProfile = __DEV__ ? sampleProfile : emptyProfile;
const initialBikes = __DEV__ ? sampleBikes : [];
const initialMaintenanceTasks = __DEV__ ? sampleMaintenanceTasks : [];
const initialRides = __DEV__ ? sampleRides : [];
const initialFuelLogs = __DEV__ ? sampleFuelLogs : [];
const initialEmergencyInfo = __DEV__ ? sampleEmergencyInfo : emptyEmergencyInfo;
const initialReferrals = __DEV__ ? sampleReferrals : [];
const initialRideListings = __DEV__ ? sampleRideListings : [];

export const useLocalAppStore = create<LocalAppState>()(
  persist(
    (set) => ({
      profile: initialProfile,
      bikes: initialBikes,
      maintenanceTasks: initialMaintenanceTasks,
      rides: initialRides,
      pendingRides: [],
      fuelLogs: initialFuelLogs,
      emergencyInfo: initialEmergencyInfo,
      referrals: initialReferrals,
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
      saveRide: (ride) =>
        set((state) => ({
          rides: state.rides.some((item) => item.id === ride.id)
            ? state.rides.map((item) => (item.id === ride.id ? ride : item))
            : [ride, ...state.rides],
        })),
      deleteRide: (rideId) =>
        set((state) => ({
          rides: state.rides.filter((r) => r.id !== rideId),
          pendingRides: state.pendingRides.filter((ride) => ride.id !== rideId),
        })),
      addPendingRide: (ride) =>
        set((state) => ({
          pendingRides: state.pendingRides.some((item) => item.id === ride.id)
            ? state.pendingRides.map((item) => (item.id === ride.id ? { ...ride, sync_status: 'pending' } : item))
            : [{ ...ride, sync_status: 'pending' }, ...state.pendingRides],
          rides: state.rides.some((item) => item.id === ride.id)
            ? state.rides.map((item) => (item.id === ride.id ? { ...ride, sync_status: 'pending' } : item))
            : [{ ...ride, sync_status: 'pending' }, ...state.rides],
        })),
      removePendingRide: (rideId) =>
        set((state) => ({
          pendingRides: state.pendingRides.filter((ride) => ride.id !== rideId),
          rides: state.rides.map((ride) => (
            ride.id === rideId
              ? { ...ride, sync_status: 'synced' }
              : ride
          )),
        })),
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
      rideListings: initialRideListings,
      addRideListing: (listing) =>
        set((state) => ({
          rideListings: [listing, ...state.rideListings],
        })),
      updateRideListing: (listing) =>
        set((state) => ({
          rideListings: state.rideListings.map((item) => (item.id === listing.id ? listing : item)),
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
      resetLocalStore: () =>
        set({
          profile: emptyProfile,
          bikes: [],
          maintenanceTasks: [],
          rides: [],
          pendingRides: [],
          fuelLogs: [],
          emergencyInfo: emptyEmergencyInfo,
          referrals: [],
          rideListings: [],
        }),
      addMaintenanceTasks: (tasks: MaintenanceTask[]) =>
        set((state) => ({
          maintenanceTasks: [...tasks, ...state.maintenanceTasks],
        })),
      setMaintenanceTasksForBike: (bikeId: string, tasks: MaintenanceTask[]) =>
        set((state) => ({
          maintenanceTasks: [
            ...tasks,
            ...state.maintenanceTasks.filter((item) => item.bike_id !== bikeId),
          ],
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
      version: LOCAL_APP_STORE_VERSION,
      storage: createJSONStorage(() => appStorage),
      migrate: (persistedState, version) => {
        const persisted = (persistedState ?? {}) as Partial<LocalAppState>;

        if (version < LOCAL_APP_STORE_VERSION) {
          return {
            ...persisted,
            profile:
              persisted.profile?.id && persisted.profile.id !== sampleProfile.id
                ? persisted.profile
                : emptyProfile,
            bikes: persisted.bikes ?? [],
            maintenanceTasks: persisted.maintenanceTasks ?? [],
            rides: persisted.rides ?? [],
            pendingRides: persisted.pendingRides ?? [],
            fuelLogs: persisted.fuelLogs ?? [],
            emergencyInfo:
              persisted.emergencyInfo?.id && persisted.emergencyInfo.id !== sampleEmergencyInfo.id
                ? persisted.emergencyInfo
                : emptyEmergencyInfo,
            referrals: persisted.referrals ?? [],
            rideListings: persisted.rideListings ?? [],
          };
        }

        return persistedState as LocalAppState;
      },
    },
  ),
);
