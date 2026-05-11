import { router } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { TabTransition } from '@/components/navigation/tab-transition';
import { EmptyState } from '@/components/ui/empty-state';
import { AppText } from '@/components/ui/app-text';
import { AppScrollScreen } from '@/components/ui/app-screen';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { SectionHeader } from '@/components/ui/section-header';
import { StatCard } from '@/components/ui/stat-card';
import { palette } from '@/constants/theme';
import { RideFeedCard } from '@/features/ride/components/ride-feed-card';
import { BikeMilestoneCard } from '@/features/ride/components/bike-milestone-card';
import { CustomCalendarHeatmap } from '@/features/ride/components/ride-heatmap';
import { EfficiencyTrendCard } from '@/features/ride/components/efficiency-trend-card';
import { PersonalRecordsCard } from '@/features/ride/components/personal-records-card';
import { UpcomingMaintenanceCard } from '@/features/ride/components/upcoming-maintenance-card';
import { WeatherWindowCard } from '@/features/ride/components/weather-window-card';
import { WeatherWidget } from '@/features/ride/components/weather-widget';
import { formatCurrencyPhp, getGreeting } from '@/lib/format';
import { useAuth } from '@/hooks/use-auth';
import { useBikes, useEarnings, useFuelLogs, useMaintenanceTasksAllBikes, useRides } from '@/hooks/use-kurbada-data';
import { useWeather } from '@/hooks/use-weather';
import { useWeatherWindow } from '@/hooks/use-weather-window';
import { useAppStore } from '@/store/app-store';
import { estimateFuelRate } from '@/lib/fuel-estimate';
import { computeEfficiencyTrend } from '@/lib/efficiency-trend';
import { computeMonthlyCostSummary } from '@/lib/maintenance-cost';
import { computePersonalRecords } from '@/lib/personal-records';

export default function RideTabScreen() {
  const { session } = useAuth();
  const activeBikeId = useAppStore((state) => state.activeBikeId);
  const setActiveBikeId = useAppStore((state) => state.setActiveBikeId);
  const ridingPersona = useAppStore((state) => state.ridingPersona);
  const workMode = useAppStore((state) => state.workMode);
  const dailyEarningsGoal = useAppStore((state) => state.dailyEarningsGoal);
  const bikes = useBikes(session?.user.id);
  const rides = useRides(session?.user.id);
  const fuelLogs = useFuelLogs(session?.user.id);
  const earnings = useEarnings(session?.user.id);
  const maintenanceTasks = useMaintenanceTasksAllBikes(session?.user.id);
  const customFuelPrice = useAppStore((state) => state.customFuelPricePerLiter);
  const weather = useWeather();
  const weatherWindow = useWeatherWindow();
  const allBikes = useMemo(() => bikes.data ?? [], [bikes.data]);
  const primaryBike = useMemo(
    () => allBikes.find((b) => b.id === activeBikeId) ?? allBikes[0],
    [allBikes, activeBikeId],
  );

  useEffect(() => {
    if (!activeBikeId && allBikes[0]?.id) setActiveBikeId(allBikes[0].id);
  }, [activeBikeId, allBikes, setActiveBikeId]);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const refetches = [
        (bikes as { refetch?: () => Promise<unknown> }).refetch,
        (rides as { refetch?: () => Promise<unknown> }).refetch,
        (fuelLogs as { refetch?: () => Promise<unknown> }).refetch,
        (earnings as { refetch?: () => Promise<unknown> }).refetch,
        (weather as { refetch?: () => Promise<unknown> }).refetch,
        (weatherWindow as { refetch?: () => Promise<unknown> }).refetch,
      ].filter(Boolean) as (() => Promise<unknown>)[];
      await Promise.all(refetches.map((fn) => fn()));
    } finally {
      setIsRefreshing(false);
    }
  }, [bikes, rides, fuelLogs, earnings, weather, weatherWindow]);

  const fuelPrice = useMemo(() => {
    if (customFuelPrice && customFuelPrice > 0) return customFuelPrice;
    const logs = fuelLogs.data ?? [];
    if (logs.length === 0) return 65;
    return logs[0].price_per_liter || 65;
  }, [customFuelPrice, fuelLogs.data]);

  const fuelRate = useMemo(() => {
    return estimateFuelRate(primaryBike?.engine_cc, primaryBike?.category, 'hustle');
  }, [primaryBike?.engine_cc, primaryBike?.category]);

  const latestRide = rides.data?.[0];

  // Today's net (work mode)
  const todaysNet = useMemo(() => {
    if (!workMode) return null;
    const today = new Date().toISOString().slice(0, 10);
    const earningsToday = (earnings.data ?? []).filter((e) => e.earned_at.slice(0, 10) === today);
    const totalEarnings = earningsToday.reduce((s, e) => s + e.amount, 0);
    const ridesToday = (rides.data ?? []).filter((r) => r.started_at.slice(0, 10) === today);
    const fuelCostToday = ridesToday.reduce((s, r) => s + (r.fuel_used_liters ?? 0) * fuelPrice, 0);
    return {
      gross: totalEarnings,
      fuelCost: fuelCostToday,
      net: totalEarnings - fuelCostToday,
      count: earningsToday.length,
    };
  }, [workMode, earnings.data, rides.data, fuelPrice]);

  const monthlyCost = useMemo(() => {
    return computeMonthlyCostSummary({
      rides: rides.data ?? [],
      fuelLogs: fuelLogs.data ?? [],
      maintenanceTasks: maintenanceTasks.data ?? [],
      fuelPricePerLiter: fuelPrice,
    });
  }, [rides.data, fuelLogs.data, maintenanceTasks.data, fuelPrice]);

  const efficiencyTrend = useMemo(() => computeEfficiencyTrend(rides.data ?? []), [rides.data]);
  const personalRecords = useMemo(() => computePersonalRecords(rides.data ?? []), [rides.data]);

  const startRide = () => {
    if (!primaryBike) {
      router.push('/(public)/bike-setup');
      return;
    }
    router.push({
      pathname: '/(app)/ride/active',
      params: { bikeId: primaryBike.id, fuelPrice: fuelPrice, fuelRate: fuelRate },
    });
  };

  // Tiles rendered in persona-driven order
  const heroTile = (() => {
    // Work persona: show today's net earnings
    if (workMode && todaysNet) {
      return (
        <GlassCard style={{ padding: 18, borderRadius: 18, gap: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <AppText variant="eyebrow">TODAY&apos;S NET</AppText>
            <MaterialCommunityIcons name="cash" size={18} color={palette.success} />
          </View>
          <AppText variant="heroMetric" style={{ fontSize: 48, lineHeight: 54, color: todaysNet.net >= 0 ? palette.success : palette.danger }}>
            {formatCurrencyPhp(todaysNet.net)}
          </AppText>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <StatCard label="Gross" value={formatCurrencyPhp(todaysNet.gross)} />
            <StatCard label="Fuel" value={formatCurrencyPhp(todaysNet.fuelCost)} />
            <StatCard label="Trips" value={String(todaysNet.count)} />
          </View>
          {dailyEarningsGoal > 0 ? (
            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <AppText variant="meta" style={{ color: palette.textSecondary }}>Goal progress</AppText>
                <AppText variant="meta" style={{ color: palette.textSecondary }}>
                  {Math.round((todaysNet.gross / dailyEarningsGoal) * 100)}% of {formatCurrencyPhp(dailyEarningsGoal)}
                </AppText>
              </View>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: palette.surfaceMuted, overflow: 'hidden' }}>
                <View
                  style={{
                    width: `${Math.min(100, (todaysNet.gross / dailyEarningsGoal) * 100)}%`,
                    height: '100%',
                    backgroundColor: palette.success,
                  }}
                />
              </View>
            </View>
          ) : null}
          <Button title="Start Shift  →" onPress={startRide} style={{ borderRadius: 13, minHeight: 52 }} />
        </GlassCard>
      );
    }

    // Commute / leisure / mix: show honest ride tile
    return (
      <GlassCard style={{ padding: 18, borderRadius: 18, gap: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <AppText variant="eyebrow">
            {ridingPersona === 'commute' ? 'DAILY COMMUTE' : ridingPersona === 'mix' ? 'YOUR RIDE' : 'WEEKEND RUN'}
          </AppText>
          <MaterialCommunityIcons name="motorbike" size={18} color={palette.danger} />
        </View>
        <AppText variant="title" style={{ fontSize: 20 }}>
          {ridingPersona === 'commute' ? 'Keep the ride efficient.' : 'Ready for the next ride?'}
        </AppText>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <StatCard
            label="Last Ride"
            value={latestRide?.distance_km.toFixed(1) ?? '0.0'}
            unit="km"
          />
          <StatCard
            label="Top Speed"
            value={latestRide?.max_speed_kmh.toFixed(0) ?? '0'}
            unit="km/h"
          />
          <StatCard
            label="Fuel"
            value={latestRide?.fuel_used_liters?.toFixed(1) ?? '0.0'}
            unit="L"
          />
        </View>
        <Button title="Start Ride  →" onPress={startRide} style={{ borderRadius: 13, minHeight: 52 }} />
      </GlassCard>
    );
  })();

  const monthlyCostTile = (
    <GlassCard style={{ padding: 18, borderRadius: 18, gap: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <AppText variant="eyebrow">THIS MONTH&apos;S TRUE COST</AppText>
        <MaterialCommunityIcons name="chart-line" size={18} color={palette.lime} />
      </View>
      <AppText variant="heroMetric" style={{ fontSize: 36, lineHeight: 42, color: palette.text }}>
        {formatCurrencyPhp(monthlyCost.totalCost)}
      </AppText>
      <AppText variant="meta" style={{ color: palette.textSecondary }}>
        {monthlyCost.distanceKm.toFixed(0)} km · ₱{monthlyCost.costPerKm.toFixed(2)}/km
      </AppText>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <StatCard label="Fuel" value={formatCurrencyPhp(monthlyCost.fuelCost)} />
        <StatCard label="Maintenance" value={formatCurrencyPhp(monthlyCost.maintenanceAccrual)} />
      </View>
    </GlassCard>
  );

  const heatmapTile = (
    <GlassCard style={{ paddingTop: 8, paddingBottom: 6, paddingHorizontal: 10, borderRadius: 18 }}>
      <CustomCalendarHeatmap rides={rides.data ?? []} numDays={90} />
    </GlassCard>
  );

  const efficiencyTile = <EfficiencyTrendCard trend={efficiencyTrend} />;
  const weatherWindowTile = <WeatherWindowCard window={weatherWindow.data?.window} />;
  const personalRecordsTile = <PersonalRecordsCard records={personalRecords} />;
  const milestoneTile = <BikeMilestoneCard bike={primaryBike} />;

  // Persona-aware ordering
  const tiles = (() => {
    if (workMode) {
      return [
        heroTile,
        monthlyCostTile,
        efficiencyTile,
        <UpcomingMaintenanceCard key="maint" />,
        heatmapTile,
      ];
    }
    if (ridingPersona === 'commute') {
      return [
        heroTile,
        monthlyCostTile,
        efficiencyTile,
        <UpcomingMaintenanceCard key="maint" />,
        milestoneTile,
        heatmapTile,
      ];
    }
    // leisure / mix — Weekend Rider Kit priority
    return [
      heroTile,
      weatherWindowTile,
      milestoneTile,
      personalRecordsTile,
      heatmapTile,
      efficiencyTile,
      <UpcomingMaintenanceCard key="maint" />,
      monthlyCostTile,
    ];
  })();

  return (
    <TabTransition>
      <AppScrollScreen showWordmark={false} refreshing={isRefreshing} onRefresh={handleRefresh}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 }}>
          <AppText variant="brand">KURBADA</AppText>
          <WeatherWidget weather={weather.data} isError={weather.isError} />
        </View>

        <AppText variant="eyebrow">{getGreeting()}, {session?.user.user_metadata.display_name ?? 'Rider'}</AppText>
        <AppText variant="screenTitle" style={{ fontSize: 34, lineHeight: 38, letterSpacing: -0.8 }}>
          {workMode ? 'Your shift, your numbers.' : 'Ride honest. Ride smart.'}
        </AppText>
        <AppText variant="body">
          {workMode
            ? 'Earnings, fuel, and net income — tracked as you ride.'
            : 'Your route, fuel cost, and maintenance — the whole truth of owning a motorcycle.'}
        </AppText>

        {allBikes.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingBottom: 8 }}>
            {allBikes.map((bike) => {
              const active = bike.id === primaryBike?.id;
              return (
                <Pressable
                  key={bike.id}
                  onPress={() => setActiveBikeId(bike.id)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 999,
                    backgroundColor: active ? palette.text : 'rgba(255,255,255,0.06)',
                    borderWidth: 0.5,
                    borderColor: active ? palette.text : palette.border,
                  }}>
                  <MaterialCommunityIcons
                    name="motorbike"
                    size={14}
                    color={active ? palette.background : palette.textSecondary}
                  />
                  <AppText
                    variant="button"
                    numberOfLines={1}
                    style={{
                      fontSize: 12,
                      color: active ? palette.background : palette.textSecondary,
                      maxWidth: 120,
                    }}>
                    {bike.make} {bike.model}
                  </AppText>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        {tiles.map((tile, i) => (
          <View key={`tile-${i}`}>{tile}</View>
        ))}

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
            <EmptyState icon="map-outline" title="No saved rides" body="Your ride feed will build into a timeline of routes and cost once you start tracking." />
          </GlassCard>
        )}
      </AppScrollScreen>
    </TabTransition>
  );
}
