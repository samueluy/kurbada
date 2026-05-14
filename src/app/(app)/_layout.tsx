import { Redirect, Stack } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Alert } from 'react-native';

import { AppScreen } from '@/components/ui/app-screen';
import { palette } from '@/constants/theme';
import { env } from '@/lib/env';
import { useAuth } from '@/hooks/use-auth';
import { useReferralMutations, useReferrals } from '@/hooks/use-kurbada-data';
import { useMaintenanceReminders } from '@/hooks/use-maintenance-reminders';

export default function AppLayout() {
  const { session, loading, signingOut, bootstrapPhase } = useAuth();
  const referrals = useReferrals(session?.user.id);
  const { markReferralNotified } = useReferralMutations(session?.user.id);
  const bypassGate = env.devBypassAppGate;
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

  if (signingOut && !bypassGate) {
    return <Redirect href="/(public)/auth/sign-in" />;
  }

  if ((loading || bootstrapPhase === 'booting') && !bypassGate) {
    return (
      <AppScreen style={{ justifyContent: 'center', alignItems: 'center' }} showWordmark={false}>
        <ActivityIndicator size="large" color={palette.text} />
      </AppScreen>
    );
  }

  if (!bypassGate && !session) {
    return <Redirect href="/(public)/auth/sign-in" />;
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
      <Stack.Screen name="ride/recover" options={{ presentation: 'card', gestureEnabled: true }} />
      <Stack.Screen name="ride/summary" options={{ presentation: 'card', gestureEnabled: true }} />
      <Stack.Screen name="ride/share-editor" options={{ presentation: 'card', gestureEnabled: true }} />
      <Stack.Screen name="garage/[bikeId]" />
      <Stack.Screen name="board/[listingId]" options={{ presentation: 'card', gestureEnabled: true }} />
      <Stack.Screen name="board/create" options={{ presentation: 'card', gestureEnabled: true }} />
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
