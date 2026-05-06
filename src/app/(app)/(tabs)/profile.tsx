import { router } from 'expo-router';
import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { AppScrollScreen } from '@/components/ui/app-screen';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { ListRow } from '@/components/ui/list-row';
import { SectionHeader } from '@/components/ui/section-header';
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
      <GlassCard style={{ alignItems: 'center', gap: 12, padding: 22 }}>
        <View style={{ width: 92, height: 92, borderRadius: 46, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}>
          <AppText variant="brand" style={{ fontSize: 30 }}>{(profile.data?.display_name ?? 'KR').slice(0, 2).toUpperCase()}</AppText>
        </View>
        <AppText variant="screenTitle" style={{ fontSize: 28 }}>
          {profile.data?.display_name ?? 'Kurbada Rider'}
        </AppText>
        <AppText variant="meta">Member since {profile.data?.created_at?.slice(0, 10) ?? '2026-05-01'}</AppText>
      </GlassCard>

      <SectionHeader title="Your Stats" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <GlassCard style={{ width: '47%', padding: 16 }}>
          <AppText variant="label">Rides</AppText>
          <AppText variant="cardMetric">{rides.data?.length ?? 0}</AppText>
        </GlassCard>
        <GlassCard style={{ width: '47%', padding: 16 }}>
          <AppText variant="label">Distance</AppText>
          <AppText variant="cardMetric">{totalDistance.toFixed(1)} km</AppText>
        </GlassCard>
        <GlassCard style={{ width: '47%', padding: 16 }}>
          <AppText variant="label">Fuel Logged</AppText>
          <AppText variant="cardMetric" style={{ fontSize: 28 }}>{formatCurrencyPhp(totalFuel)}</AppText>
        </GlassCard>
        <GlassCard style={{ width: '47%', padding: 16 }}>
          <AppText variant="label">Bikes</AppText>
          <AppText variant="cardMetric">{bikes.data?.length ?? 0}</AppText>
        </GlassCard>
      </View>

      <SectionHeader title="Emergency Info QR" />
      <EmergencyQRCard emergency={emergency.data} onPress={() => router.push('/(app)/profile/emergency')} />

      <SectionHeader title="Settings" />
      <GlassCard style={{ padding: 18 }}>
        <ListRow icon="notifications-outline" title="Notifications" subtitle="Crash alerts and reminders" />
        <ListRow icon="swap-horizontal-outline" title="Units" subtitle="Metric" />
        <ListRow icon="language-outline" title="Language" subtitle="English / Filipino" />
        <ListRow icon="card-outline" title="Subscription status" subtitle={profile.data?.subscription_status ?? 'inactive'} />
        <ListRow icon="document-text-outline" title="Privacy Policy" subtitle="Draft content placeholder" />
        <ListRow icon="document-outline" title="Terms of Service" subtitle="Draft content placeholder" />
      </GlassCard>

      <Button title="Sign Out" variant="secondary" onPress={async () => { await signOut(); router.replace('/(public)/auth/sign-in'); }} />
    </AppScrollScreen>
  );
}
