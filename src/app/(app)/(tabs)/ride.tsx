import { router } from 'expo-router';
import { Sparkles, Waves } from 'lucide-react-native';
import { View } from 'react-native';

import { EmptyState } from '@/components/ui/empty-state';
import { AppText } from '@/components/ui/app-text';
import { AppScrollScreen } from '@/components/ui/app-screen';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { ModeToggle } from '@/components/ui/mode-toggle';
import { SectionHeader } from '@/components/ui/section-header';
import { StatCard } from '@/components/ui/stat-card';
import { palette } from '@/constants/theme';
import { RideFeedCard } from '@/features/ride/components/ride-feed-card';
import { RideHeroCard } from '@/features/ride/components/ride-hero-card';
import { getGreeting } from '@/lib/format';
import { useAuth } from '@/hooks/use-auth';
import { useBikes, useRides } from '@/hooks/use-kurbada-data';
import { useAppStore } from '@/store/app-store';

export default function RideTabScreen() {
  const { session } = useAuth();
  const preferredMode = useAppStore((state) => state.preferredMode);
  const setPreferredMode = useAppStore((state) => state.setPreferredMode);
  const bikes = useBikes(session?.user.id);
  const rides = useRides(session?.user.id);
  const latestRide = rides.data?.[0];
  const primaryBike = bikes.data?.[0];

  return (
    <AppScrollScreen>
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Sparkles size={14} color={palette.lime} />
          <AppText variant="meta" style={{ color: palette.textSecondary }}>
            {getGreeting()}, {session?.user.user_metadata.display_name ?? 'Rider'}
          </AppText>
        </View>
        <AppText variant="screenTitle">
          Ride like it matters.
        </AppText>
        <AppText variant="meta" style={{ color: palette.textSecondary }}>
          Kurbada turns your latest run, lean, and machine story into something worth keeping.
        </AppText>
      </View>

      <ModeToggle value={preferredMode} onChange={setPreferredMode} />

      {latestRide ? (
        <RideHeroCard ride={latestRide} />
      ) : (
        <GlassCard style={{ padding: 20 }}>
          <EmptyState icon="speedometer-outline" title="No ride yet" body="Start a ride and the live telemetry story will land here first." />
        </GlassCard>
      )}

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <StatCard label="Distance" value={latestRide?.distance_km.toFixed(1) ?? '0.0'} unit="km" />
        <StatCard label="Top Speed" value={latestRide?.max_speed_kmh.toFixed(0) ?? '0'} unit="km/h" />
        <StatCard label="Max Lean" value={latestRide?.max_lean_angle_deg?.toFixed(0) ?? '0'} unit="deg" accent />
      </View>

      <GlassCard style={{ padding: 18, gap: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ gap: 6 }}>
            <AppText variant="label">Ride session</AppText>
            <AppText variant="sectionTitle" style={{ fontSize: 22 }}>
              Ready to roll?
            </AppText>
          </View>
          <Waves size={18} color={palette.textSecondary} />
        </View>
        <AppText variant="meta">
          Weekend keeps the cinematic telemetry front and center. Hustle stays lighter and more utility-driven.
        </AppText>
        <Button
          title="Start Ride"
          onPress={() => {
            if (!primaryBike) {
              router.push('/(public)/bike-setup');
              return;
            }

            router.push({
              pathname: '/(app)/ride/active',
              params: { mode: preferredMode, bikeId: primaryBike.id },
            });
          }}
        />
      </GlassCard>

      <SectionHeader title="Recent Rides" action={<AppText variant="meta">Latest sessions</AppText>} />
      {rides.data?.length ? (
        <View style={{ gap: 14 }}>
          {rides.data.slice(0, 3).map((ride) => (
            <RideFeedCard key={ride.id} ride={ride} />
          ))}
        </View>
      ) : (
        <GlassCard style={{ padding: 18 }}>
          <EmptyState icon="map-outline" title="No saved rides" body="Your ride feed will build into a timeline of routes, speed, and lean once you start tracking." />
        </GlassCard>
      )}
    </AppScrollScreen>
  );
}
