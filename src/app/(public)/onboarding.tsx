import { Redirect } from 'expo-router';
import { useEffect } from 'react';

import { useAppStore } from '@/store/app-store';

export default function LegacyOnboardingScreen() {
  const setOnboardingStep = useAppStore((state) => state.setOnboardingStep);

  useEffect(() => {
    setOnboardingStep(1);
  }, [setOnboardingStep]);

  return <Redirect href="/(public)/bike-setup?flow=onboarding" />;
}
