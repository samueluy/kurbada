import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { AppScreen } from '@/components/ui/app-screen';
import { env } from '@/lib/env';
import { useAuth } from '@/hooks/use-auth';
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
  const bypassGate = env.devBypassAppGate;

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

  if (!bypassGate && !hasCompletedOnboarding) {
    if (onboardingStep === 8 && purchaseCompleted) return <Redirect href={'/(public)/success' as any} />;
    return <Redirect href={getOnboardingRoute(onboardingStep) as any} />;
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
