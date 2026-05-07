import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { appStorage } from '@/lib/storage';
import type { RideMode } from '@/types/domain';

export type OnboardingStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type OnboardingData = {
  bikeBrand: string;
  ccClass: string;
  ridingStyle: RideMode;
  fullName: string;
  bloodType: string;
  emergencyContact: string;
};

const defaultOnboardingData: OnboardingData = {
  bikeBrand: '',
  ccClass: '',
  ridingStyle: 'weekend',
  fullName: '',
  bloodType: 'O+',
  emergencyContact: '',
};

type AppStore = {
  hasSeenSplash: boolean;
  hasCompletedOnboarding: boolean;
  hasCompletedBikeSetup: boolean;
  onboardingStep: OnboardingStep;
  preferredMode: RideMode;
  purchaseCompleted: boolean;
  onboardingData: OnboardingData;
  setHasSeenSplash: () => void;
  completeOnboarding: () => void;
  completeBikeSetup: () => void;
  setOnboardingStep: (step: OnboardingStep) => void;
  setPreferredMode: (mode: RideMode) => void;
  setPurchaseCompleted: (value: boolean) => void;
  setOnboardingData: (data: Partial<OnboardingData>) => void;
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
      onboardingData: defaultOnboardingData,
      setHasSeenSplash: () => set({ hasSeenSplash: true }),
      completeOnboarding: () => set({ hasCompletedOnboarding: true }),
      completeBikeSetup: () => set({ hasCompletedBikeSetup: true }),
      setOnboardingStep: (onboardingStep) => set({ onboardingStep }),
      setPreferredMode: (mode) => set({ preferredMode: mode }),
      setPurchaseCompleted: (purchaseCompleted) => set({ purchaseCompleted }),
      setOnboardingData: (data) =>
        set((state) => ({
          onboardingData: { ...state.onboardingData, ...data },
        })),
      resetOnboardingData: () => set({ onboardingData: defaultOnboardingData }),
    }),
    {
      name: 'kurbada-app',
      storage: createJSONStorage(() => appStorage),
      partialize: (state) => ({
        hasSeenSplash: state.hasSeenSplash,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        hasCompletedBikeSetup: state.hasCompletedBikeSetup,
        onboardingStep: state.onboardingStep,
        preferredMode: state.preferredMode,
        purchaseCompleted: state.purchaseCompleted,
        onboardingData: state.onboardingData,
      }),
    },
  ),
);
