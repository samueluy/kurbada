import { Redirect, Stack } from 'expo-router';

import { env } from '@/lib/env';
import { useAuth } from '@/hooks/use-auth';
import { useUserAccess } from '@/hooks/use-user-access';
import { useAppStore } from '@/store/app-store';

export default function AppLayout() {
  const { session, loading } = useAuth();
  const hasCompletedBikeSetup = useAppStore((state) => state.hasCompletedBikeSetup);
  const access = useUserAccess(session?.user.id);
  const bypassGate = env.devBypassAppGate;

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

  return (
    <Stack screenOptions={{ headerShown: false }}>
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
