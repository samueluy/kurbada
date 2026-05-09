import type { OnboardingStep } from '@/store/app-store';

export const ONBOARDING_TOTAL_STEPS = 7;

const onboardingRoutes: Record<OnboardingStep, string> = {
  1: '/(public)/onboarding',
  2: '/(public)/bike-setup?flow=onboarding',
  3: '/(public)/maintenance',
  4: '/(public)/emergency?flow=onboarding',
  5: '/(public)/features',
  6: '/(public)/permissions',
  7: '/(public)/paywall?context=onboarding',
  8: '/(public)/success',
};

export function getOnboardingRoute(step: OnboardingStep): string {
  return onboardingRoutes[step];
}
