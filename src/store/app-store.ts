import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { appStorage } from '@/lib/storage';
import type { Bike, EmergencyBloodType, MaintenancePresetKey, RideMode } from '@/types/domain';
import { useLocalAppStore } from '@/store/local-app-store';

export type OnboardingStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type OnboardingSyncStatus = 'idle' | 'pending' | 'syncing' | 'completed' | 'failed';
export type OnboardingDraftScope = 'anonymous-signup' | null;
export type OnboardingDraftTargetMode = 'new-account-only' | null;

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
  onboardingDraftScope: OnboardingDraftScope;
  onboardingDraftTargetMode: OnboardingDraftTargetMode;
  onboardingDraftTargetEmail: string | null;
  onboardingSyncStatus: OnboardingSyncStatus;
  onboardingSyncedUserId: string | null;
  onboardingSyncedBikeId: string | null;
  onboardingSyncedEmergencyId: string | null;
  customFuelPricePerLiter: number | null;
  crashAlertsEnabled: boolean;
  keepScreenAwakeDuringRide: boolean;
  maintenanceRemindersEnabled: boolean;
  maintenanceReminderThresholds: number[];
  maintenanceReminderLastNotified: Record<string, number>;
  didSignOut: boolean;
  authSigningOut: boolean;
  activeBikeId: string | null;
  ridingPersona: RidingPersona;
  workMode: boolean;
  dailyEarningsGoal: number;
  hasSeenCommunityGuidelines: boolean;
  dailySummaryEnabled: boolean;
  dailySummaryHour: number; // 0-23, local time
  comebackNudgesEnabled: boolean;
  lobbyRemindersEnabled: boolean;
  acknowledgedBikeMilestones: Record<string, number[]>; // bikeId -> list of odo km thresholds
  freshSignupEmail: string | null;
  freshSignupStartedAt: number | null;
  setHasSeenSplash: () => void;
  completeOnboarding: () => void;
  completeBikeSetup: () => void;
  setOnboardingStep: (step: OnboardingStep) => void;
  setPreferredMode: (mode: RideMode) => void;
  setPurchaseCompleted: (value: boolean) => void;
  setPendingReferralCode: (code: string) => void;
  setOnboardingData: (data: Partial<OnboardingData>) => void;
  markAnonymousOnboardingDraftActive: () => void;
  markOnboardingDraftForNewAccount: (email: string) => void;
  clearAnonymousOnboardingDraft: () => void;
  setCustomFuelPricePerLiter: (price: number | null) => void;
  setCrashAlertsEnabled: (value: boolean) => void;
  setKeepScreenAwakeDuringRide: (value: boolean) => void;
  setMaintenanceRemindersEnabled: (value: boolean) => void;
  setMaintenanceReminderThresholds: (thresholds: number[]) => void;
  setMaintenanceReminderLastNotified: (taskId: string, threshold: number) => void;
  setDidSignOut: (value: boolean) => void;
  setAuthSigningOut: (value: boolean) => void;
  setActiveBikeId: (bikeId: string | null) => void;
  setRidingPersona: (persona: RidingPersona) => void;
  setWorkMode: (value: boolean) => void;
  setDailyEarningsGoal: (value: number) => void;
  setHasSeenCommunityGuidelines: (value: boolean) => void;
  setDailySummaryEnabled: (value: boolean) => void;
  setDailySummaryHour: (hour: number) => void;
  setComebackNudgesEnabled: (value: boolean) => void;
  setLobbyRemindersEnabled: (value: boolean) => void;
  acknowledgeBikeMilestone: (bikeId: string, milestoneKm: number) => void;
  markFreshSignupSession: (email: string) => void;
  clearFreshSignupSession: () => void;
  resetForSignOut: () => void;
  markOnboardingSyncing: () => void;
  markOnboardingSyncComplete: (payload: { userId: string; bikeId?: string | null; emergencyId?: string | null }) => void;
  markOnboardingSyncFailed: () => void;
  resetOnboardingSyncStatus: () => void;
  resetOnboardingData: () => void;
};

const APP_STORE_VERSION = 3;

function migrateOnboardingStep(step: number | undefined): OnboardingStep {
  switch (step) {
    case 2:
      return 1;
    case 3:
      return 2;
    case 4:
      return 3;
    case 5:
      return 4;
    case 6:
      return 5;
    case 7:
      return 6;
    case 8:
      return 7;
    case 1:
    default:
      return 1;
  }
}

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
      onboardingDraftScope: null,
      onboardingDraftTargetMode: null,
      onboardingDraftTargetEmail: null,
      onboardingSyncStatus: 'idle',
      onboardingSyncedUserId: null,
      onboardingSyncedBikeId: null,
      onboardingSyncedEmergencyId: null,
      customFuelPricePerLiter: null,
      crashAlertsEnabled: true,
      keepScreenAwakeDuringRide: false,
      maintenanceRemindersEnabled: true,
      maintenanceReminderThresholds: [50, 80, 90, 95, 100],
      maintenanceReminderLastNotified: {},
      didSignOut: false,
      authSigningOut: false,
      activeBikeId: null,
      ridingPersona: 'leisure',
      workMode: false,
      dailyEarningsGoal: 1500,
      hasSeenCommunityGuidelines: false,
      dailySummaryEnabled: false,
      dailySummaryHour: 21,
      comebackNudgesEnabled: true,
      lobbyRemindersEnabled: true,
      acknowledgedBikeMilestones: {},
      freshSignupEmail: null,
      freshSignupStartedAt: null,
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
          onboardingDraftScope: 'anonymous-signup',
          onboardingSyncStatus: 'pending',
        })),
      markAnonymousOnboardingDraftActive: () =>
        set((state) => ({
          onboardingDraftScope: state.onboardingDraftScope ?? 'anonymous-signup',
        })),
      markOnboardingDraftForNewAccount: (email) =>
        set({
          onboardingDraftScope: 'anonymous-signup',
          onboardingDraftTargetMode: 'new-account-only',
          onboardingDraftTargetEmail: email.trim().toLowerCase() || null,
          onboardingSyncStatus: 'pending',
        }),
      clearAnonymousOnboardingDraft: () =>
        set({
          onboardingData: defaultOnboardingData,
          onboardingDraftScope: null,
          onboardingDraftTargetMode: null,
          onboardingDraftTargetEmail: null,
          onboardingSyncStatus: 'idle',
          onboardingSyncedUserId: null,
          onboardingSyncedBikeId: null,
          onboardingSyncedEmergencyId: null,
        }),
      setCustomFuelPricePerLiter: (customFuelPricePerLiter) => set({ customFuelPricePerLiter }),
      setCrashAlertsEnabled: (crashAlertsEnabled) => set({ crashAlertsEnabled }),
      setKeepScreenAwakeDuringRide: (keepScreenAwakeDuringRide) => set({ keepScreenAwakeDuringRide }),
      setMaintenanceRemindersEnabled: (maintenanceRemindersEnabled) => set({ maintenanceRemindersEnabled }),
      setMaintenanceReminderThresholds: (maintenanceReminderThresholds) => set({ maintenanceReminderThresholds }),
      setMaintenanceReminderLastNotified: (taskId, threshold) =>
        set((state) => ({
          maintenanceReminderLastNotified: { ...state.maintenanceReminderLastNotified, [taskId]: threshold },
        })),
      setDidSignOut: (didSignOut) => set({ didSignOut }),
      setAuthSigningOut: (authSigningOut) => set({ authSigningOut }),
      setActiveBikeId: (activeBikeId) => set({ activeBikeId }),
      setRidingPersona: (ridingPersona) => set({ ridingPersona }),
      setWorkMode: (workMode) => set({ workMode }),
      setDailyEarningsGoal: (dailyEarningsGoal) => set({ dailyEarningsGoal }),
      setHasSeenCommunityGuidelines: (hasSeenCommunityGuidelines) => set({ hasSeenCommunityGuidelines }),
      setDailySummaryEnabled: (dailySummaryEnabled) => set({ dailySummaryEnabled }),
      setDailySummaryHour: (dailySummaryHour) => set({ dailySummaryHour }),
      setComebackNudgesEnabled: (comebackNudgesEnabled) => set({ comebackNudgesEnabled }),
      setLobbyRemindersEnabled: (lobbyRemindersEnabled) => set({ lobbyRemindersEnabled }),
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
      markFreshSignupSession: (email) =>
        set({
          freshSignupEmail: email.trim().toLowerCase() || null,
          freshSignupStartedAt: Date.now(),
        }),
      clearFreshSignupSession: () =>
        set({
          freshSignupEmail: null,
          freshSignupStartedAt: null,
        }),
      resetForSignOut: () => {
        useLocalAppStore.getState().resetLocalStore();
        return set({
          hasCompletedOnboarding: false,
          hasCompletedBikeSetup: false,
          onboardingStep: 1,
          purchaseCompleted: false,
          pendingReferralCode: '',
          onboardingData: defaultOnboardingData,
          onboardingDraftScope: null,
          onboardingDraftTargetMode: null,
          onboardingDraftTargetEmail: null,
          onboardingSyncStatus: 'idle',
          onboardingSyncedUserId: null,
          onboardingSyncedBikeId: null,
          onboardingSyncedEmergencyId: null,
          didSignOut: true,
          activeBikeId: null,
          freshSignupEmail: null,
          freshSignupStartedAt: null,
        });
      },
      markOnboardingSyncing: () => set({ onboardingSyncStatus: 'syncing' }),
      markOnboardingSyncComplete: ({ userId, bikeId = null, emergencyId = null }) =>
        set({
          onboardingData: defaultOnboardingData,
          onboardingDraftScope: null,
          onboardingDraftTargetMode: null,
          onboardingDraftTargetEmail: null,
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
          onboardingDraftScope: null,
          onboardingDraftTargetMode: null,
          onboardingDraftTargetEmail: null,
          onboardingSyncStatus: 'idle',
          onboardingSyncedUserId: null,
          onboardingSyncedBikeId: null,
          onboardingSyncedEmergencyId: null,
        }),
    }),
    {
      name: 'kurbada-app',
      version: APP_STORE_VERSION,
      storage: createJSONStorage(() => appStorage),
      migrate: (persistedState, version) => {
        const persisted = (persistedState ?? {}) as Partial<AppStore>;

        if (version < APP_STORE_VERSION) {
          return {
            ...persisted,
            onboardingStep: migrateOnboardingStep(
              typeof persisted.onboardingStep === 'number' ? persisted.onboardingStep : 1,
            ),
            didSignOut: false,
            authSigningOut: false,
            onboardingDraftScope:
              persisted.onboardingDraftTargetMode === 'new-account-only'
                ? persisted.onboardingDraftScope ?? null
                : null,
            onboardingDraftTargetMode:
              persisted.onboardingDraftTargetMode === 'new-account-only'
                ? persisted.onboardingDraftTargetMode
                : null,
            onboardingDraftTargetEmail:
              persisted.onboardingDraftTargetMode === 'new-account-only'
                ? persisted.onboardingDraftTargetEmail ?? null
                : null,
            comebackNudgesEnabled: persisted.comebackNudgesEnabled ?? true,
            lobbyRemindersEnabled: persisted.lobbyRemindersEnabled ?? true,
            freshSignupEmail: null,
            freshSignupStartedAt: null,
          };
        }

        return persistedState as AppStore;
      },
      merge: (persistedState, currentState) => {
        const persisted = (persistedState ?? {}) as Partial<AppStore>;

        return {
          ...currentState,
          ...persisted,
          onboardingData: {
            ...defaultOnboardingData,
            ...(persisted.onboardingData ?? {}),
          },
          onboardingStep: migrateOnboardingStep(
            typeof persisted.onboardingStep === 'number' ? persisted.onboardingStep : currentState.onboardingStep,
          ),
          onboardingDraftScope: persisted.onboardingDraftScope ?? null,
          onboardingDraftTargetMode: persisted.onboardingDraftTargetMode ?? null,
          onboardingDraftTargetEmail: persisted.onboardingDraftTargetEmail ?? null,
          didSignOut: false,
          authSigningOut: false,
          freshSignupEmail: null,
          freshSignupStartedAt: null,
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
        onboardingDraftScope: state.onboardingDraftScope,
        onboardingDraftTargetMode: state.onboardingDraftTargetMode,
        onboardingDraftTargetEmail: state.onboardingDraftTargetEmail,
        onboardingSyncStatus: state.onboardingSyncStatus,
        onboardingSyncedUserId: state.onboardingSyncedUserId,
        onboardingSyncedBikeId: state.onboardingSyncedBikeId,
        onboardingSyncedEmergencyId: state.onboardingSyncedEmergencyId,
        didSignOut: state.didSignOut,
        customFuelPricePerLiter: state.customFuelPricePerLiter,
        crashAlertsEnabled: state.crashAlertsEnabled,
        keepScreenAwakeDuringRide: state.keepScreenAwakeDuringRide,
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
          comebackNudgesEnabled: state.comebackNudgesEnabled,
          lobbyRemindersEnabled: state.lobbyRemindersEnabled,
          acknowledgedBikeMilestones: state.acknowledgedBikeMilestones,
        }),
    },
  ),
);
