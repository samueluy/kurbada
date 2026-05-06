import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { appStorage } from '@/lib/storage';
import type { LanguagePreference, RideMode, UnitsPreference } from '@/types/domain';

type AppStore = {
  hasSeenSplash: boolean;
  hasCompletedOnboarding: boolean;
  hasCompletedBikeSetup: boolean;
  preferredMode: RideMode;
  language: LanguagePreference;
  units: UnitsPreference;
  setHasSeenSplash: () => void;
  completeOnboarding: () => void;
  completeBikeSetup: () => void;
  setPreferredMode: (mode: RideMode) => void;
  setLanguage: (language: LanguagePreference) => void;
  setUnits: (units: UnitsPreference) => void;
};

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      hasSeenSplash: false,
      hasCompletedOnboarding: false,
      hasCompletedBikeSetup: false,
      preferredMode: 'weekend',
      language: 'en',
      units: 'metric',
      setHasSeenSplash: () => set({ hasSeenSplash: true }),
      completeOnboarding: () => set({ hasCompletedOnboarding: true }),
      completeBikeSetup: () => set({ hasCompletedBikeSetup: true }),
      setPreferredMode: (mode) => set({ preferredMode: mode }),
      setLanguage: (language) => set({ language }),
      setUnits: (units) => set({ units }),
    }),
    {
      name: 'kurbada-app',
      storage: createJSONStorage(() => appStorage),
      partialize: (state) => ({
        hasSeenSplash: state.hasSeenSplash,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        hasCompletedBikeSetup: state.hasCompletedBikeSetup,
        preferredMode: state.preferredMode,
        language: state.language,
        units: state.units,
      }),
    },
  ),
);
