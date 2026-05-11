import { Redirect, Stack, usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Alert } from 'react-native';

import { AppScreen } from '@/components/ui/app-screen';
import { palette } from '@/constants/theme';
import { env } from '@/lib/env';
import { useAuth } from '@/hooks/use-auth';
import { useReferralMutations, useReferrals } from '@/hooks/use-kurbada-data';
import { useMaintenanceReminders } from '@/hooks/use-maintenance-reminders';
import { useUserAccess } from '@/hooks/use-user-access';
import { useAppStore } from '@/store/app-store';

export default function AppLayout() {
  const { session, loading } = useAuth();
  const pathname = usePathname();
  const hasCompletedBikeSetup = useAppStore((state) => state.hasCompletedBikeSetup);
  const access = useUserAccess(session?.user.id);
  const referrals = useReferrals(session?.user.id);
  const { markReferralNotified } = useReferralMutations(session?.user.id);
  const bypassGate = env.devBypassAppGate;
  const isBillingRoute = pathname === '/profile/billing';
  const shownReferralIdRef = useRef<string | null>(null);

  useMaintenanceReminders();

  useEffect(() => {
    if (!session?.user.id || !referrals.data?.length) return;

    const reward = referrals.data.find(
      (item) =>
        item.referrer_user_id === session.user.id
        && item.status === 'rewarded'
        && !item.notified_at,
    );

    if (!reward || shownReferralIdRef.current === reward.id) return;

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
    return (
      <AppScreen style={{ justifyContent: 'center', alignItems: 'center' }} showWordmark={false}>
        <ActivityIndicator size="large" color={palette.text} />
      </AppScreen>
    );
  }

  if (!bypassGate && !session) {
    return <Redirect href="/(public)/auth/sign-in" />;
  }

  if (!bypassGate && !access.data?.hasAccess && !isBillingRoute) {
    return <Redirect href="/(public)/paywall" />;
  }

  if (!hasCompletedBikeSetup) {
    return <Redirect href="/(public)/bike-setup" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: palette.background },
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
        gestureDirection: 'horizontal',
      }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="ride/active" options={{ presentation: 'modal', gestureEnabled: true }} />
      <Stack.Screen name="ride/summary" options={{ presentation: 'modal' }} />
      <Stack.Screen name="garage/[bikeId]" />
      <Stack.Screen name="board/create" options={{ presentation: 'modal' }} />
      <Stack.Screen name="board/community-guidelines" options={{ presentation: 'modal' }} />
      <Stack.Screen name="board/blocked-users" />
      <Stack.Screen name="board/leaderboard" />
      <Stack.Screen name="fuel/reports" />
      <Stack.Screen name="profile/billing" />
      <Stack.Screen name="profile/emergency" />
      <Stack.Screen name="profile/notifications" />
      <Stack.Screen name="profile/work-mode" />
      <Stack.Screen name="profile/gear/index" />
      <Stack.Screen name="profile/gear/add" />
      <Stack.Screen name="profile/delete-account" />
    </Stack>
  );
}
