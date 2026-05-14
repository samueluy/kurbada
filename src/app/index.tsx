import { Redirect } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { AppScreen } from '@/components/ui/app-screen';
import { env } from '@/lib/env';
import { useAuth } from '@/hooks/use-auth';
import { useBikes } from '@/hooks/use-kurbada-data';
import { useUnfinishedRideRecovery } from '@/hooks/use-unfinished-ride-recovery';
import { useUserAccess } from '@/hooks/use-user-access';
import { palette } from '@/constants/theme';
import { getOnboardingRoute } from '@/lib/onboarding-flow';
import { hasFailedOnboardingSyncForUser, hasPendingOnboardingSyncForUser } from '@/lib/onboarding-sync';
import { useAppStore } from '@/store/app-store';

export default function IndexScreen() {
  const { session, loading, signingOut, bootstrapPhase } = useAuth();
  const hasSeenSplash = useAppStore((state) => state.hasSeenSplash);
  const hasCompletedOnboarding = useAppStore((state) => state.hasCompletedOnboarding);
  const hasCompletedBikeSetup = useAppStore((state) => state.hasCompletedBikeSetup);
  const onboardingStep = useAppStore((state) => state.onboardingStep);
  const purchaseCompleted = useAppStore((state) => state.purchaseCompleted);
  const onboardingDraftScope = useAppStore((state) => state.onboardingDraftScope);
  const onboardingDraftTargetMode = useAppStore((state) => state.onboardingDraftTargetMode);
  const onboardingDraftTargetEmail = useAppStore((state) => state.onboardingDraftTargetEmail);
  const onboardingSyncStatus = useAppStore((state) => state.onboardingSyncStatus);
  const access = useUserAccess(session?.user.id);
  const remoteBikes = useBikes(session?.user.id);
  const unfinishedRide = useUnfinishedRideRecovery(Boolean(session?.user.id));
  const bypassGate = env.devBypassAppGate;
  const didSignOut = useAppStore((state) => state.didSignOut);
  const completeOnboarding = useAppStore((state) => state.completeOnboarding);
  const completeBikeSetup = useAppStore((state) => state.completeBikeSetup);
  const hasRemoteBike = (remoteBikes.data?.length ?? 0) > 0;
  const bikesResolved = !remoteBikes.isLoading;
  const bikesFailed = Boolean(remoteBikes.error);
  const hasPendingOnboardingSync = hasPendingOnboardingSyncForUser({
    scope: onboardingDraftScope,
    targetMode: onboardingDraftTargetMode,
    targetEmail: onboardingDraftTargetEmail,
    status: onboardingSyncStatus,
    userEmail: session?.user.email,
  });
  const hasFailedOnboardingSync = hasFailedOnboardingSyncForUser({
    scope: onboardingDraftScope,
    targetMode: onboardingDraftTargetMode,
    targetEmail: onboardingDraftTargetEmail,
    status: onboardingSyncStatus,
    userEmail: session?.user.email,
  });
  const bootstrapStartedAtRef = useRef(Date.now());
  const [bootstrapTimedOut, setBootstrapTimedOut] = useState(false);
  const hasLoggedInteractiveRef = useRef(false);

  useEffect(() => {
    if (!session?.user.id) {
      setBootstrapTimedOut(false);
      hasLoggedInteractiveRef.current = false;
      return;
    }

    const timeout = setTimeout(() => {
      setBootstrapTimedOut(true);
    }, 2500);

    return () => clearTimeout(timeout);
  }, [session?.user.id]);

  useEffect(() => {
    if (!bypassGate && session && hasRemoteBike && (!hasCompletedOnboarding || !hasCompletedBikeSetup)) {
      completeOnboarding();
      completeBikeSetup();
    }
  }, [
    bypassGate,
    session,
    hasRemoteBike,
    hasCompletedBikeSetup,
    hasCompletedOnboarding,
    completeOnboarding,
    completeBikeSetup,
  ]);

  useEffect(() => {
    if (session?.user.id && !hasLoggedInteractiveRef.current && (bikesResolved || bootstrapTimedOut)) {
      hasLoggedInteractiveRef.current = true;
      console.info(`[bootstrap] authenticated_shell_ms=${Date.now() - bootstrapStartedAtRef.current}`);
    }
  }, [bikesResolved, bootstrapTimedOut, session?.user.id]);

  useEffect(() => {
    if (bikesResolved) {
      console.info(
        `[bootstrap] bikes_${bikesFailed ? 'error' : 'ready'}_ms=${Date.now() - bootstrapStartedAtRef.current}`,
      );
    }
  }, [bikesFailed, bikesResolved]);

  useEffect(() => {
    if (access.hasResolvedAccess) {
      console.info(
        `[bootstrap] access_ready_ms=${Date.now() - bootstrapStartedAtRef.current} reason=${access.data.reason} grace_candidate=${access.allowOnboardingGrace}`,
      );
    }
  }, [access.allowOnboardingGrace, access.data.reason, access.hasResolvedAccess]);

  const shouldShowBootstrapLoader = useMemo(() => (
    Boolean(session?.user.id)
    && !bootstrapTimedOut
    && (
      bootstrapPhase === 'booting'
      || remoteBikes.isLoading
      || hasPendingOnboardingSync
      || unfinishedRide.isLoading
    )
  ), [bootstrapPhase, bootstrapTimedOut, hasPendingOnboardingSync, remoteBikes.isLoading, session?.user.id, unfinishedRide.isLoading]);

  if (signingOut) {
    return <Redirect href="/(public)/auth/sign-in" />;
  }

  if ((loading || bootstrapPhase === 'booting') && !bypassGate) {
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

  if (!bypassGate && !session && didSignOut) {
    return <Redirect href="/(public)/auth/sign-in" />;
  }

  if (!bypassGate && session) {
    if (access.data.reason === 'grace') {
      console.info('[bootstrap] allowing_onboarding_grace_access');
    }

    if (access.shouldRequirePaywall) {
      return <Redirect href="/(public)/paywall" />;
    }

    if (unfinishedRide.data?.session) {
      return <Redirect href={'/(app)/ride/recover' as any} />;
    }

    if (purchaseCompleted && onboardingStep === 7 && !hasRemoteBike && (hasPendingOnboardingSync || hasFailedOnboardingSync)) {
      return <Redirect href={'/(public)/success' as any} />;
    }

    if (hasPendingOnboardingSync && !hasRemoteBike) {
      return (
        <AppScreen style={{ justifyContent: 'center', alignItems: 'center' }} showWordmark={false}>
          <View style={{ alignItems: 'center', gap: 12 }}>
            <ActivityIndicator size="small" color={palette.textSecondary} />
            <AppText variant="meta" style={{ color: palette.textSecondary }}>
              Finishing your garage…
            </AppText>
          </View>
        </AppScreen>
      );
    }

    if (bikesResolved && !bikesFailed && !hasRemoteBike) {
      return <Redirect href="/(public)/bike-setup" />;
    }

    if (shouldShowBootstrapLoader) {
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

    return <Redirect href="/(app)/(tabs)/ride" />;
  }

  if (!bypassGate && !hasCompletedOnboarding) {
    if (onboardingStep === 7 && purchaseCompleted) return <Redirect href={'/(public)/success' as any} />;
    return <Redirect href={getOnboardingRoute(onboardingStep) as any} />;
  }

  if (!bypassGate && !session) {
    return <Redirect href="/(public)/auth/sign-in" />;
  }

  return <Redirect href="/(app)/(tabs)/ride" />;
}
