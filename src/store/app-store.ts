import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { appStorage } from '@/lib/storage';
import type { Bike, EmergencyBloodType, MaintenancePresetKey, RideMode } from '@/types/domain';

export type OnboardingStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type OnboardingSyncStatus = 'idle' | 'pending' | 'syncing' | 'completed' | 'failed';

export type RidingPersona = 'leisure' | 'commute' | 'work' | 'mix';

export type PlatformTag = 'grab' | 'lalamove' | 'foodpanda' | 'moveit' | 'joyride' | 'other';

export type OnboardingData = {
  bikeBrand: string;
  bikeModel: string;
  bikeYear: string;
  bikeEngineCc: string;
  bikeOdometerKm: string;
  bikeCategory: Bike['category'];
  ridingStyle: RideMode;
  maintenancePresetKeys: MaintenancePresetKey[];
  fullName: string;
  bloodType: EmergencyBloodType;
  emergencyContactName: string;
  emergencyContactPhone: string;
  allergies: string;
  conditions: string;
};

const defaultOnboardingData: OnboardingData = {
  bikeBrand: '',
  bikeModel: '',
  bikeYear: '',
  bikeEngineCc: '',
  bikeOdometerKm: '',
  bikeCategory: 'naked',
  ridingStyle: 'weekend',
  maintenancePresetKeys: [],
  fullName: '',
  bloodType: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  allergies: '',
  conditions: '',
};

type AppStore = {
  hasSeenSplash: boolean;
  hasCompletedOnboarding: boolean;
  hasCompletedBikeSetup: boolean;
  onboardingStep: OnboardingStep;
  preferredMode: RideMode;
  purchaseCompleted: boolean;
  pendingReferralCode: string;
  onboardingData: OnboardingData;
  onboardingSyncStatus: OnboardingSyncStatus;
  onboardingSyncedUserId: string | null;
  onboardingSyncedBikeId: string | null;
  onboardingSyncedEmergencyId: string | null;
  customFuelPricePerLiter: number | null;
  crashAlertsEnabled: boolean;
  maintenanceRemindersEnabled: boolean;
  maintenanceReminderThresholds: number[];
  maintenanceReminderLastNotified: Record<string, number>;
  didSignOut: boolean;
  activeBikeId: string | null;
  ridingPersona: RidingPersona;
  workMode: boolean;
  dailyEarningsGoal: number;
  hasSeenCommunityGuidelines: boolean;
  dailySummaryEnabled: boolean;
  dailySummaryHour: number; // 0-23, local time
  acknowledgedBikeMilestones: Record<string, number[]>; // bikeId -> list of odo km thresholds
  setHasSeenSplash: () => void;
  completeOnboarding: () => void;
  completeBikeSetup: () => void;
  setOnboardingStep: (step: OnboardingStep) => void;
  setPreferredMode: (mode: RideMode) => void;
  setPurchaseCompleted: (value: boolean) => void;
  setPendingReferralCode: (code: string) => void;
  setOnboardingData: (data: Partial<OnboardingData>) => void;
  setCustomFuelPricePerLiter: (price: number | null) => void;
  setCrashAlertsEnabled: (value: boolean) => void;
  setMaintenanceRemindersEnabled: (value: boolean) => void;
  setMaintenanceReminderThresholds: (thresholds: number[]) => void;
  setMaintenanceReminderLastNotified: (taskId: string, threshold: number) => void;
  setDidSignOut: (value: boolean) => void;
  setActiveBikeId: (bikeId: string | null) => void;
  setRidingPersona: (persona: RidingPersona) => void;
  setWorkMode: (value: boolean) => void;
  setDailyEarningsGoal: (value: number) => void;
  setHasSeenCommunityGuidelines: (value: boolean) => void;
  setDailySummaryEnabled: (value: boolean) => void;
  setDailySummaryHour: (hour: number) => void;
  acknowledgeBikeMilestone: (bikeId: string, milestoneKm: number) => void;
  resetForSignOut: () => void;
  markOnboardingSyncing: () => void;
  markOnboardingSyncComplete: (payload: { userId: string; bikeId?: string | null; emergencyId?: string | null }) => void;
  markOnboardingSyncFailed: () => void;
  resetOnboardingSyncStatus: () => void;
  resetOnboardingData: () => void;
};

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      hasSeenSplash: false,
      hasCompletedOnboarding: false,
      hasCompletedBikeSetup: false,
      onboardingStep: 1,
      preferredMode: 'weekend',
      purchaseCompleted: false,
      pendingReferralCode: '',
      onboardingData: defaultOnboardingData,
      onboardingSyncStatus: 'idle',
      onboardingSyncedUserId: null,
      onboardingSyncedBikeId: null,
      onboardingSyncedEmergencyId: null,
      customFuelPricePerLiter: null,
      crashAlertsEnabled: true,
      maintenanceRemindersEnabled: true,
      maintenanceReminderThresholds: [50, 80, 90, 95, 100],
      maintenanceReminderLastNotified: {},
      didSignOut: false,
      activeBikeId: null,
      ridingPersona: 'leisure',
      workMode: false,
      dailyEarningsGoal: 1500,
      hasSeenCommunityGuidelines: false,
      dailySummaryEnabled: false,
      dailySummaryHour: 21,
      acknowledgedBikeMilestones: {},
      setHasSeenSplash: () => set({ hasSeenSplash: true }),
      completeOnboarding: () => set({ hasCompletedOnboarding: true }),
      completeBikeSetup: () => set({ hasCompletedBikeSetup: true }),
      setOnboardingStep: (onboardingStep) => set({ onboardingStep }),
      setPreferredMode: (mode) => set({ preferredMode: mode }),
      setPurchaseCompleted: (purchaseCompleted) => set({ purchaseCompleted }),
      setPendingReferralCode: (pendingReferralCode) => set({ pendingReferralCode }),
      setOnboardingData: (data) =>
        set((state) => ({
          onboardingData: { ...state.onboardingData, ...data },
          onboardingSyncStatus: 'pending',
        })),
      setCustomFuelPricePerLiter: (customFuelPricePerLiter) => set({ customFuelPricePerLiter }),
      setCrashAlertsEnabled: (crashAlertsEnabled) => set({ crashAlertsEnabled }),
      setMaintenanceRemindersEnabled: (maintenanceRemindersEnabled) => set({ maintenanceRemindersEnabled }),
      setMaintenanceReminderThresholds: (maintenanceReminderThresholds) => set({ maintenanceReminderThresholds }),
      setMaintenanceReminderLastNotified: (taskId, threshold) =>
        set((state) => ({
          maintenanceReminderLastNotified: { ...state.maintenanceReminderLastNotified, [taskId]: threshold },
        })),
      setDidSignOut: (didSignOut) => set({ didSignOut }),
      setActiveBikeId: (activeBikeId) => set({ activeBikeId }),
      setRidingPersona: (ridingPersona) => set({ ridingPersona }),
      setWorkMode: (workMode) => set({ workMode }),
      setDailyEarningsGoal: (dailyEarningsGoal) => set({ dailyEarningsGoal }),
      setHasSeenCommunityGuidelines: (hasSeenCommunityGuidelines) => set({ hasSeenCommunityGuidelines }),
      setDailySummaryEnabled: (dailySummaryEnabled) => set({ dailySummaryEnabled }),
      setDailySummaryHour: (dailySummaryHour) => set({ dailySummaryHour }),
      acknowledgeBikeMilestone: (bikeId, milestoneKm) =>
        set((state) => {
          const existing = state.acknowledgedBikeMilestones[bikeId] ?? [];
          if (existing.includes(milestoneKm)) return state;
          return {
            acknowledgedBikeMilestones: {
              ...state.acknowledgedBikeMilestones,
              [bikeId]: [...existing, milestoneKm].sort((a, b) => a - b),
            },
          };
        }),
      resetForSignOut: () =>
        set((state) => ({
          hasCompletedOnboarding: false,
          hasCompletedBikeSetup: state.hasCompletedBikeSetup,
          onboardingStep: 1,
          purchaseCompleted: false,
          onboardingData: defaultOnboardingData,
          onboardingSyncStatus: 'idle',
          onboardingSyncedUserId: null,
          onboardingSyncedBikeId: null,
          onboardingSyncedEmergencyId: null,
          didSignOut: true,
        })),
      markOnboardingSyncing: () => set({ onboardingSyncStatus: 'syncing' }),
      markOnboardingSyncComplete: ({ userId, bikeId = null, emergencyId = null }) =>
        set({
          onboardingData: defaultOnboardingData,
          onboardingSyncStatus: 'completed',
          onboardingSyncedUserId: userId,
          onboardingSyncedBikeId: bikeId,
          onboardingSyncedEmergencyId: emergencyId,
        }),
      markOnboardingSyncFailed: () => set({ onboardingSyncStatus: 'failed' }),
      resetOnboardingSyncStatus: () => set({ onboardingSyncStatus: 'pending' }),
      resetOnboardingData: () =>
        set({
          onboardingData: defaultOnboardingData,
          onboardingSyncStatus: 'idle',
          onboardingSyncedUserId: null,
          onboardingSyncedBikeId: null,
          onboardingSyncedEmergencyId: null,
        }),
    }),
    {
      name: 'kurbada-app',
      storage: createJSONStorage(() => appStorage),
      merge: (persistedState, currentState) => {
        const persisted = (persistedState ?? {}) as Partial<AppStore>;

        return {
          ...currentState,
          ...persisted,
          onboardingData: {
            ...defaultOnboardingData,
            ...(persisted.onboardingData ?? {}),
          },
        };
      },
      partialize: (state) => ({
        hasSeenSplash: state.hasSeenSplash,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        hasCompletedBikeSetup: state.hasCompletedBikeSetup,
        onboardingStep: state.onboardingStep,
        preferredMode: state.preferredMode,
        purchaseCompleted: state.purchaseCompleted,
        pendingReferralCode: state.pendingReferralCode,
        onboardingData: state.onboardingData,
        onboardingSyncStatus: state.onboardingSyncStatus,
        onboardingSyncedUserId: state.onboardingSyncedUserId,
        onboardingSyncedBikeId: state.onboardingSyncedBikeId,
        onboardingSyncedEmergencyId: state.onboardingSyncedEmergencyId,
        customFuelPricePerLiter: state.customFuelPricePerLiter,
        crashAlertsEnabled: state.crashAlertsEnabled,
        maintenanceRemindersEnabled: state.maintenanceRemindersEnabled,
        maintenanceReminderThresholds: state.maintenanceReminderThresholds,
        maintenanceReminderLastNotified: state.maintenanceReminderLastNotified,
        activeBikeId: state.activeBikeId,
        ridingPersona: state.ridingPersona,
        workMode: state.workMode,
        dailyEarningsGoal: state.dailyEarningsGoal,
        hasSeenCommunityGuidelines: state.hasSeenCommunityGuidelines,
        dailySummaryEnabled: state.dailySummaryEnabled,
        dailySummaryHour: state.dailySummaryHour,
        acknowledgedBikeMilestones: state.acknowledgedBikeMilestones,
      }),
    },
  ),
);
