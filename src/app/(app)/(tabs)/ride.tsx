import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMemo } from 'react';
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
import { CustomCalendarHeatmap } from '@/features/ride/components/ride-heatmap';
import { UpcomingMaintenanceCard } from '@/features/ride/components/upcoming-maintenance-card';
import { WeatherWidget } from '@/features/ride/components/weather-widget';
import { formatCurrencyPhp, getGreeting } from '@/lib/format';
import { useAuth } from '@/hooks/use-auth';
import { useBikes, useFuelLogs, useRides } from '@/hooks/use-kurbada-data';
import { useWeather } from '@/hooks/use-weather';
import { useAppStore } from '@/store/app-store';
import { estimateFuelRate } from '@/lib/fuel-estimate';

export default function RideTabScreen() {
  const { session } = useAuth();
  const preferredMode = useAppStore((state) => state.preferredMode);
  const setPreferredMode = useAppStore((state) => state.setPreferredMode);
  const bikes = useBikes(session?.user.id);
  const rides = useRides(session?.user.id);
  const fuelLogs = useFuelLogs(session?.user.id);
  const customFuelPrice = useAppStore((state) => state.customFuelPricePerLiter);
  const weather = useWeather();
  const latestRide = rides.data?.[0];
  const primaryBike = bikes.data?.[0];

  const fuelPrice = useMemo(() => {
    if (customFuelPrice && customFuelPrice > 0) return customFuelPrice;
    const logs = fuelLogs.data ?? [];
    if (logs.length === 0) return 65;
    return logs[0].price_per_liter || 65;
  }, [customFuelPrice, fuelLogs.data]);

  const fuelRate = useMemo(() => {
    return estimateFuelRate(
      primaryBike?.engine_cc,
      primaryBike?.category,
      preferredMode,
    );
  }, [primaryBike?.engine_cc, primaryBike?.category, preferredMode]);
  const latestFuelCost = latestRide?.fuel_used_liters ? latestRide.fuel_used_liters * fuelPrice : 0;

  const isWeekend = preferredMode === 'weekend';

  return (
    <AppScrollScreen showWordmark={false}>
      {/* 1. Top bar */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
        <AppText variant="brand">KURBADA</AppText>
        <WeatherWidget weather={weather.data} isError={weather.isError} />
      </View>

      {/* 2. Greeting + title */}
      <AppText variant="eyebrow">{getGreeting()}, {session?.user.user_metadata.display_name ?? 'Rider'}</AppText>
      <AppText variant="screenTitle" style={{ fontSize: 34, lineHeight: 38, letterSpacing: -0.8 }}>
        {isWeekend ? 'Ready for the next curve.' : 'Traffic efficiency.'}
      </AppText>
      <AppText variant="body">
        {isWeekend
          ? 'Weekend mode keeps lean, distance, and top-speed telemetry close at hand.'
          : 'Daily mode prioritizes speed, fuel awareness, and cleaner daily tracking.'}
      </AppText>

      {/* 3. Mode toggle */}
      <ModeToggle value={preferredMode} onChange={setPreferredMode} />

      <GlassCard style={{ paddingTop: 8, paddingBottom: 6, paddingHorizontal: 10, borderRadius: 18 }}>
        <CustomCalendarHeatmap rides={rides.data ?? []} numDays={90} />
      </GlassCard>

      {isWeekend ? (
        <GlassCard style={{ padding: 18, borderRadius: 18, gap: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <AppText variant="eyebrow">WEEKEND TELEMETRY</AppText>
            <MaterialCommunityIcons name="motorbike" size={18} color={palette.danger} />
          </View>
          <AppText variant="title" style={{ fontSize: 20 }}>Ready to hunt the next apex?</AppText>
          <AppText variant="body" style={{ color: palette.textTertiary, fontSize: 13 }}>
            Lean tracking, top speed, elevation, and route energy stay front and center for every spirited run.
          </AppText>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <StatCard label="Top Speed" value={latestRide?.max_speed_kmh.toFixed(0) ?? '0'} unit="km/h" />
            <StatCard label="Max Lean" value={latestRide?.max_lean_angle_deg?.toFixed(0) ?? '0'} unit="deg" accent />
          </View>
          <Button
            title="Start Weekend Ride  →"
            onPress={() => {
              if (!primaryBike) {
                router.push('/(public)/bike-setup');
                return;
              }
              router.push({
                pathname: '/(app)/ride/active',
                params: { mode: preferredMode, bikeId: primaryBike.id, fuelPrice: fuelPrice, fuelRate: fuelRate },
              });
            }}
            style={{
              borderRadius: 13,
              minHeight: 52,
              shadowColor: 'rgba(192,57,43,0.35)',
              shadowOpacity: 1,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 4 },
            }}
          />
        </GlassCard>
      ) : (
        <GlassCard style={{ padding: 18, borderRadius: 18, gap: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <AppText variant="eyebrow">DAILY EFFICIENCY</AppText>
            <MaterialCommunityIcons name="flash-outline" size={18} color={palette.lime} />
          </View>
          <View style={{ gap: 6 }}>
            <AppText variant="title" style={{ fontSize: 20 }}>Keep the run efficient.</AppText>
            <AppText variant="heroMetric" style={{ fontSize: 44, lineHeight: 50, color: palette.lime }}>
              {formatCurrencyPhp(latestFuelCost)}
            </AppText>
            <AppText variant="meta" style={{ color: palette.textSecondary }}>
              Estimated cost from your latest tracked ride
            </AppText>
          </View>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <StatCard label="Fuel Burn" value={latestRide?.fuel_used_liters?.toFixed(1) ?? '0.0'} unit="L" />
            <StatCard label="Fuel Rate" value={fuelRate.toFixed(1)} unit="km/L" />
          </View>
          <Button
            title="Start Daily Ride  →"
            onPress={() => {
              if (!primaryBike) {
                router.push('/(public)/bike-setup');
                return;
              }
              router.push({
                pathname: '/(app)/ride/active',
                params: { mode: preferredMode, bikeId: primaryBike.id, fuelPrice: fuelPrice, fuelRate: fuelRate },
              });
            }}
            style={{
              backgroundColor: palette.lime,
              borderRadius: 13,
              minHeight: 52,
              shadowColor: 'rgba(224,84,68,0.22)',
              shadowOpacity: 1,
              shadowRadius: 14,
              shadowOffset: { width: 0, height: 4 },
            }}
          />
        </GlassCard>
      )}

      {/* 6. Upcoming Maintenance */}
      <UpcomingMaintenanceCard />

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <StatCard label="Distance" value={latestRide?.distance_km.toFixed(1) ?? '0.0'} unit="km" />
        {isWeekend ? (
          <>
            <StatCard label="Avg Speed" value={latestRide?.avg_speed_kmh.toFixed(0) ?? '0'} unit="km/h" />
            <StatCard label="Route Pts" value={String(latestRide?.route_point_count_simplified ?? 0)} unit="pts" />
          </>
        ) : (
          <>
            <StatCard label="Top Speed" value={latestRide?.max_speed_kmh.toFixed(0) ?? '0'} unit="km/h" />
            <StatCard label="Est. Fuel" value={latestRide?.fuel_used_liters?.toFixed(1) ?? '0.0'} unit="L" />
          </>
        )}
      </View>

      {/* 8. Recent Rides */}
      <SectionHeader title="Recent Rides" action={<AppText variant="meta" style={{ color: palette.textTertiary }}>See all</AppText>} />
      {rides.data?.length ? (
        <View style={{ gap: 14 }}>
            {rides.data.slice(0, 3).map((ride) => (
              <RideFeedCard
                key={ride.id}
                ride={ride}
                onPress={() => router.push({ pathname: '/(app)/ride/summary', params: { rideId: ride.id } })}
                onShare={() => router.push({ pathname: '/(app)/ride/summary', params: { rideId: ride.id } })}
              />
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
