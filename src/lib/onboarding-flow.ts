import type { OnboardingStep } from '@/store/app-store';

export const ONBOARDING_TOTAL_STEPS = 6;

const onboardingRoutes: Record<OnboardingStep, string> = {
  1: '/(public)/bike-setup?flow=onboarding',
  2: '/(public)/maintenance',
  3: '/(public)/emergency?flow=onboarding',
  4: '/(public)/features',
  5: '/(public)/permissions',
  6: '/(public)/paywall?context=onboarding',
  7: '/(public)/success',
};

export function getOnboardingRoute(step: OnboardingStep): string {
  return onboardingRoutes[step];
}
