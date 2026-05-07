import { Redirect, Stack } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';

import { AppScreen } from '@/components/ui/app-screen';
import { AppText } from '@/components/ui/app-text';
import { palette } from '@/constants/theme';
import { env } from '@/lib/env';
import { useAuth } from '@/hooks/use-auth';
import { useOnboardingSync, useReferralMutations, useReferrals } from '@/hooks/use-kurbada-data';
import { useUserAccess } from '@/hooks/use-user-access';
import { useAppStore } from '@/store/app-store';

export default function AppLayout() {
  const { session, loading } = useAuth();
  const hasCompletedBikeSetup = useAppStore((state) => state.hasCompletedBikeSetup);
  const hasCompletedOnboarding = useAppStore((state) => state.hasCompletedOnboarding);
  const access = useUserAccess(session?.user.id);
  const referrals = useReferrals(session?.user.id);
  const onboardingSync = useOnboardingSync(session?.user.id);
  const { markReferralNotified } = useReferralMutations(session?.user.id);
  const bypassGate = env.devBypassAppGate;
  const shownReferralIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!session?.user.id || !referrals.data?.length) {
      return;
    }

    const reward = referrals.data.find(
      (item) =>
        item.referrer_user_id === session.user.id
        && item.status === 'rewarded'
        && !item.notified_at,
    );

    if (!reward || shownReferralIdRef.current === reward.id) {
      return;
    }

    shownReferralIdRef.current = reward.id;

    Alert.alert(
      'Referral unlocked',
      `${reward.referred_display_name ?? 'A rider'} just joined! +1 Month of Premium added to your ignition.`,
      [
        {
          text: 'Nice',
          onPress: () => {
            void markReferralNotified.mutateAsync(reward.id);
          },
        },
      ],
    );
  }, [markReferralNotified, referrals.data, session?.user.id]);

  if (loading && !bypassGate) {
    return null;
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

  if (hasCompletedOnboarding && onboardingSync.isSyncing) {
    return (
      <AppScreen style={{ justifyContent: 'center', alignItems: 'center', gap: 16 }} showWordmark={false}>
        <ActivityIndicator size="large" color={palette.text} />
        <View style={{ gap: 6, alignItems: 'center' }}>
          <AppText variant="screenTitle" style={{ textAlign: 'center', fontSize: 26 }}>
            Syncing your garage
          </AppText>
          <AppText variant="meta" style={{ color: palette.textSecondary, textAlign: 'center' }}>
            Saving your bike setup and emergency card before you drop into the app.
          </AppText>
        </View>
      </AppScreen>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: palette.background },
      }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="ride/active" options={{ presentation: 'modal', gestureEnabled: true }} />
      <Stack.Screen name="ride/summary" options={{ presentation: 'modal' }} />
      <Stack.Screen name="garage/[bikeId]" />
      <Stack.Screen name="board/create" options={{ presentation: 'modal' }} />
      <Stack.Screen name="fuel/reports" />
      <Stack.Screen name="profile/emergency" />
    </Stack>
  );
}
