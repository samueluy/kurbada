import { Redirect } from 'expo-router';

import { env } from '@/lib/env';
import { useAuth } from '@/hooks/use-auth';
import { useUserAccess } from '@/hooks/use-user-access';
import { useAppStore } from '@/store/app-store';

export default function IndexScreen() {
  const { session, loading } = useAuth();
  const hasSeenSplash = useAppStore((state) => state.hasSeenSplash);
  const hasCompletedOnboarding = useAppStore((state) => state.hasCompletedOnboarding);
  const hasCompletedBikeSetup = useAppStore((state) => state.hasCompletedBikeSetup);
  const onboardingStep = useAppStore((state) => state.onboardingStep);
  const purchaseCompleted = useAppStore((state) => state.purchaseCompleted);
  const access = useUserAccess(session?.user.id);
  const bypassGate = env.devBypassAppGate;

  if (loading && !bypassGate) {
    if (!hasSeenSplash) {
      return <Redirect href="/(public)/splash" />;
    }

    return null;
  }

  if (!hasSeenSplash) {
    return <Redirect href="/(public)/splash" />;
  }

  if (!bypassGate && !hasCompletedOnboarding) {
    if (onboardingStep === 1) return <Redirect href="/(public)/onboarding" />;
    if (onboardingStep === 2) return <Redirect href="/(public)/bike-setup?flow=onboarding" />;
    if (onboardingStep === 3) return <Redirect href="/(public)/maintenance" />;
    if (onboardingStep === 4) return <Redirect href="/(public)/emergency?flow=onboarding" />;
    if (onboardingStep === 5) return <Redirect href={'/(public)/features' as any} />;
    if (onboardingStep === 6) return <Redirect href={'/(public)/permissions' as any} />;
    if (onboardingStep === 7) return <Redirect href="/(public)/paywall" />;
    if (onboardingStep === 8 && purchaseCompleted) return <Redirect href={'/(public)/success' as any} />;
  }

  if (!bypassGate && !session) {
    return <Redirect href="/(public)/auth/sign-in" />;
  }

  if (!bypassGate && !access.data?.hasAccess) {
    return <Redirect href="/(public)/paywall" />;
  }

  if (!hasCompletedBikeSetup) {
    return <Redirect href="/(public)/bike-setup" />;
  }

  return <Redirect href="/(app)/(tabs)/ride" />;
}
