import { Redirect } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { AppScreen } from '@/components/ui/app-screen';
import { env } from '@/lib/env';
import { useAuth } from '@/hooks/use-auth';
import { useBikes } from '@/hooks/use-kurbada-data';
import { useUserAccess } from '@/hooks/use-user-access';
import { palette } from '@/constants/theme';
import { getOnboardingRoute } from '@/lib/onboarding-flow';
import { useAppStore } from '@/store/app-store';

export default function IndexScreen() {
  const { session, loading } = useAuth();
  const hasSeenSplash = useAppStore((state) => state.hasSeenSplash);
  const hasCompletedOnboarding = useAppStore((state) => state.hasCompletedOnboarding);
  const hasCompletedBikeSetup = useAppStore((state) => state.hasCompletedBikeSetup);
  const onboardingStep = useAppStore((state) => state.onboardingStep);
  const purchaseCompleted = useAppStore((state) => state.purchaseCompleted);
  const access = useUserAccess(session?.user.id);
  const remoteBikes = useBikes(session?.user.id);
  const bypassGate = env.devBypassAppGate;
  const didSignOut = useAppStore((state) => state.didSignOut);
  const setDidSignOut = useAppStore((state) => state.setDidSignOut);
  const completeOnboarding = useAppStore((state) => state.completeOnboarding);
  const completeBikeSetup = useAppStore((state) => state.completeBikeSetup);
  const hasRemoteBike = (remoteBikes.data?.length ?? 0) > 0;

  useEffect(() => {
    if (!bypassGate && session && !hasCompletedOnboarding && hasCompletedBikeSetup) {
      completeOnboarding();
    }
  }, [bypassGate, session, hasCompletedOnboarding, hasCompletedBikeSetup, completeOnboarding]);

  useEffect(() => {
    if (!bypassGate && session && !hasCompletedOnboarding && !remoteBikes.isLoading && hasRemoteBike) {
      completeOnboarding();
      if (!hasCompletedBikeSetup) completeBikeSetup();
    }
  }, [
    bypassGate,
    session,
    hasCompletedOnboarding,
    remoteBikes.isLoading,
    hasRemoteBike,
    hasCompletedBikeSetup,
    completeOnboarding,
    completeBikeSetup,
  ]);

  if (didSignOut) {
    setDidSignOut(false);
    return <Redirect href="/(public)/auth/sign-in" />;
  }

  if (loading && !bypassGate) {
    if (!hasSeenSplash) {
      return <Redirect href="/(public)/splash" />;
    }
    return (
      <AppScreen style={{ justifyContent: 'center', alignItems: 'center' }} showWordmark={false}>
        <View style={{ alignItems: 'center', gap: 12 }}>
          <ActivityIndicator size="small" color={palette.textSecondary} />
          <AppText variant="meta" style={{ color: palette.textSecondary }}>
            Loading your rider profile…
          </AppText>
        </View>
      </AppScreen>
    );
  }

  if (!hasSeenSplash) {
    return <Redirect href="/(public)/splash" />;
  }

  if (!bypassGate && session && !hasCompletedOnboarding && hasCompletedBikeSetup) {
    completeOnboarding();
    if (!session) return <Redirect href="/(public)/auth/sign-in" />;
    return <Redirect href="/(app)/(tabs)/ride" />;
  }

  if (!bypassGate && session && !hasCompletedOnboarding) {
    if (remoteBikes.isLoading) {
      return (
        <AppScreen style={{ justifyContent: 'center', alignItems: 'center' }} showWordmark={false}>
          <View style={{ alignItems: 'center', gap: 12 }}>
            <ActivityIndicator size="small" color={palette.textSecondary} />
            <AppText variant="meta" style={{ color: palette.textSecondary }}>
              Loading your rider profile…
            </AppText>
          </View>
        </AppScreen>
      );
    }
    if (hasRemoteBike) {
      return (
        <AppScreen style={{ justifyContent: 'center', alignItems: 'center' }} showWordmark={false}>
          <View style={{ alignItems: 'center', gap: 12 }}>
            <ActivityIndicator size="small" color={palette.textSecondary} />
            <AppText variant="meta" style={{ color: palette.textSecondary }}>
              Restoring your rider profile…
            </AppText>
          </View>
        </AppScreen>
      );
    }
  }

  if (!bypassGate && !hasCompletedOnboarding) {
    if (onboardingStep === 8 && purchaseCompleted) return <Redirect href={'/(public)/success' as any} />;
    return <Redirect href={getOnboardingRoute(onboardingStep) as any} />;
  }

  if (!bypassGate && !session) {
    return <Redirect href="/(public)/auth/sign-in" />;
  }

  if (!bypassGate && session && access.isLoading) {
    return (
      <AppScreen style={{ justifyContent: 'center', alignItems: 'center' }} showWordmark={false}>
        <View style={{ alignItems: 'center', gap: 12 }}>
          <ActivityIndicator size="small" color={palette.textSecondary} />
          <AppText variant="meta" style={{ color: palette.textSecondary }}>
            Checking your access…
          </AppText>
        </View>
      </AppScreen>
    );
  }

  if (!bypassGate && !access.data?.hasAccess) {
    return <Redirect href="/(public)/paywall" />;
  }

  if (!hasCompletedBikeSetup) {
    return <Redirect href="/(public)/bike-setup" />;
  }

  return <Redirect href="/(app)/(tabs)/ride" />;
}
