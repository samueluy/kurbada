import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { appStorage } from '@/lib/storage';
import type { Bike, EmergencyBloodType, MaintenancePresetKey, RideMode } from '@/types/domain';

export type OnboardingStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type OnboardingSyncStatus = 'idle' | 'pending' | 'syncing' | 'completed' | 'failed';

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
  bloodType: 'O+',
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
  setHasSeenSplash: () => void;
  completeOnboarding: () => void;
  completeBikeSetup: () => void;
  setOnboardingStep: (step: OnboardingStep) => void;
  setPreferredMode: (mode: RideMode) => void;
  setPurchaseCompleted: (value: boolean) => void;
  setPendingReferralCode: (code: string) => void;
  setOnboardingData: (data: Partial<OnboardingData>) => void;
  setCustomFuelPricePerLiter: (price: number | null) => void;
  markOnboardingSyncing: () => void;
  markOnboardingSyncComplete: (payload: { userId: string; bikeId?: string | null; emergencyId?: string | null }) => void;
  markOnboardingSyncFailed: () => void;
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
      }),
    },
  ),
);
