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
  const access = useUserAccess(session?.user.id);
  const bypassGate = env.devBypassAppGate;

  if (loading && !bypassGate) {
    return <Redirect href="/(public)/splash" />;
  }

  if (!hasSeenSplash) {
    return <Redirect href="/(public)/splash" />;
  }

  if (!bypassGate && !hasCompletedOnboarding) {
    return <Redirect href="/(public)/onboarding" />;
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
