import { router } from 'expo-router';
import { Alert, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { AppScrollScreen } from '@/components/ui/app-screen';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { ListRow } from '@/components/ui/list-row';
import { SectionHeader } from '@/components/ui/section-header';
import { palette } from '@/constants/theme';
import { EmergencyQRCard } from '@/features/profile/components/emergency-qr-card';
import { formatCurrencyPhp } from '@/lib/format';
import { useAuth } from '@/hooks/use-auth';
import { useBikes, useEmergencyInfo, useFuelLogs, useRides } from '@/hooks/use-kurbada-data';
import { useUserProfile } from '@/hooks/use-user-access';

export default function ProfileTabScreen() {
  const { session, signOut } = useAuth();
  const profile = useUserProfile(session?.user.id);
  const rides = useRides(session?.user.id);
  const fuelLogs = useFuelLogs(session?.user.id);
  const bikes = useBikes(session?.user.id);
  const emergency = useEmergencyInfo(session?.user.id);

  const totalDistance = (rides.data ?? []).reduce((sum, ride) => sum + ride.distance_km, 0);
  const totalFuel = (fuelLogs.data ?? []).reduce((sum, log) => sum + log.total_cost, 0);

  return (
    <AppScrollScreen>
      <View style={{ gap: 8 }}>
        <AppText variant="eyebrow">Profile</AppText>
        <AppText variant="screenTitle">Rider identity, kept tight.</AppText>
        <AppText variant="body">Your stats, emergency identity, and account details live here.</AppText>
      </View>

      <GlassCard style={{ alignItems: 'center', gap: 12, padding: 22 }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: palette.surfaceMuted, alignItems: 'center', justifyContent: 'center' }}>
          <AppText variant="bodyBold" style={{ fontSize: 24 }}>{(profile.data?.display_name ?? 'KR').slice(0, 2).toUpperCase()}</AppText>
        </View>
        <AppText variant="title" style={{ fontSize: 22 }}>
          {profile.data?.display_name ?? 'Kurbada Rider'}
        </AppText>
        <AppText variant="meta">Member since {profile.data?.created_at?.slice(0, 10) ?? '2026-05-01'}</AppText>
      </GlassCard>

      <SectionHeader title="Your Stats" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <GlassCard style={{ width: '47%', padding: 14, borderRadius: 14 }}>
          <AppText variant="label">Rides</AppText>
          <AppText variant="cardMetric">{rides.data?.length ?? 0}</AppText>
        </GlassCard>
        <GlassCard style={{ width: '47%', padding: 14, borderRadius: 14 }}>
          <AppText variant="label">Distance</AppText>
          <AppText variant="cardMetric">{totalDistance.toFixed(1)} km</AppText>
        </GlassCard>
        <GlassCard style={{ width: '47%', padding: 14, borderRadius: 14 }}>
          <AppText variant="label">Fuel Logged</AppText>
          <AppText variant="cardMetric" style={{ fontSize: 22 }}>{formatCurrencyPhp(totalFuel)}</AppText>
        </GlassCard>
        <GlassCard style={{ width: '47%', padding: 14, borderRadius: 14 }}>
          <AppText variant="label">Bikes</AppText>
          <AppText variant="cardMetric">{bikes.data?.length ?? 0}</AppText>
        </GlassCard>
      </View>

      <SectionHeader title="Emergency Info QR" />
      <EmergencyQRCard emergency={emergency.data} onPress={() => router.push('/(app)/profile/emergency')} />

      <SectionHeader title="Settings" />
      <GlassCard style={{ padding: 18 }}>
        <ListRow
          icon="notifications-outline"
          title="Notifications"
          subtitle="Crash alerts and reminders"
          onPress={() => Alert.alert('Coming Soon', 'Push notification settings will be available in a future update.')}
        />
        <ListRow
          icon="card-outline"
          title="Billing"
          subtitle={profile.data?.subscription_status ?? 'inactive'}
          onPress={() => router.push('/(public)/paywall')}
        />
      </GlassCard>

      <Button title="Sign Out" variant="secondary" onPress={async () => { await signOut(); router.replace('/(public)/auth/sign-in'); }} />

      <View style={{ paddingVertical: 24 }}>
        <AppText variant="meta" style={{ fontSize: 11, opacity: 0.25, textAlign: 'center' }}>
          Privacy Policy · Terms of Service
        </AppText>
      </View>
    </AppScrollScreen>
  );
}
