import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, InteractionManager, Pressable, RefreshControl, ScrollView, View } from 'react-native';

import { TabTransition } from '@/components/navigation/tab-transition';
import { EmptyState } from '@/components/ui/empty-state';
import { AppText } from '@/components/ui/app-text';
import { AppScreen } from '@/components/ui/app-screen';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { KeyboardSheet } from '@/components/ui/keyboard-sheet';
import { SectionHeader } from '@/components/ui/section-header';
import { StatCard } from '@/components/ui/stat-card';
import { palette } from '@/constants/theme';
import { BikeMilestoneCard } from '@/features/ride/components/bike-milestone-card';
import { EfficiencyTrendCard } from '@/features/ride/components/efficiency-trend-card';
import { PersonalRecordsCard } from '@/features/ride/components/personal-records-card';
import { RideFeedCard } from '@/features/ride/components/ride-feed-card';
import { CustomCalendarHeatmap } from '@/features/ride/components/ride-heatmap';
import { UpcomingMaintenanceCard } from '@/features/ride/components/upcoming-maintenance-card';
import { WeatherWidget } from '@/features/ride/components/weather-widget';
import { WeatherWindowCard } from '@/features/ride/components/weather-window-card';
import { formatCurrencyPhp, getGreeting } from '@/lib/format';
import { computeEfficiencyTrend } from '@/lib/efficiency-trend';
import { estimateFuelRate } from '@/lib/fuel-estimate';
import { computePersonalRecords } from '@/lib/personal-records';
import { useAuth } from '@/hooks/use-auth';
import { useBikes, useRecentRideFeed, useRideDashboardMetrics, useRideMutations, useRides } from '@/hooks/use-kurbada-data';
import { useCachedLocation } from '@/hooks/use-cached-location';
import { useUserProfile } from '@/hooks/use-user-access';
import { useWeather } from '@/hooks/use-weather';
import { useWeatherWindow } from '@/hooks/use-weather-window';
import { useAppStore } from '@/store/app-store';
import { useMovementDetection } from '@/hooks/use-movement-detection';
import type { RideFeedRecord } from '@/types/domain';

type RideTabItem =
  | { type: 'tile'; key: string; content: React.ReactElement }
  | { type: 'section'; key: string }
  | { type: 'ride'; key: string; ride: RideFeedRecord }
  | { type: 'empty'; key: string };

export default function RideTabScreen() {
  const { session } = useAuth();
  const activeBikeId = useAppStore((state) => state.activeBikeId);
  const setActiveBikeId = useAppStore((state) => state.setActiveBikeId);
  const ridingPersona = useAppStore((state) => state.ridingPersona);
  const workMode = useAppStore((state) => state.workMode);
  const dailyEarningsGoal = useAppStore((state) => state.dailyEarningsGoal);
  const customFuelPricePerLiter = useAppStore((state) => state.customFuelPricePerLiter);
  const [secondaryReady, setSecondaryReady] = useState(false);
  const [showRidePicker, setShowRidePicker] = useState(false);
  const [selectedRideBikeId, setSelectedRideBikeId] = useState<string | null>(null);
  const bikes = useBikes(session?.user.id);
  const rides = useRides(session?.user.id, { enabled: secondaryReady });
  const recentRides = useRecentRideFeed(session?.user.id, 12, { enabled: secondaryReady });
  const dashboardMetrics = useRideDashboardMetrics(session?.user.id, { enabled: secondaryReady });
  const { syncPendingRides } = useRideMutations(session?.user.id);
  const weather = useWeather({ enabled: secondaryReady });
  const weatherWindow = useWeatherWindow({ enabled: secondaryReady });
  const cachedLocation = useCachedLocation({ enabled: secondaryReady });
  const profile = useUserProfile(session?.user.id);
  const params = useLocalSearchParams<{ autoStart?: string }>();
  useMovementDetection();
  const allBikes = useMemo(() => bikes.data ?? [], [bikes.data]);
  const bikesById = useMemo(() => new Map(allBikes.map((bike) => [bike.id, bike])), [allBikes]);
  const primaryBike = useMemo(
    () => allBikes.find((bike) => bike.id === activeBikeId) ?? allBikes[0],
    [activeBikeId, allBikes],
  );

  useEffect(() => {
    if (!activeBikeId && allBikes[0]?.id) {
      setActiveBikeId(allBikes[0].id);
    }
  }, [activeBikeId, allBikes, setActiveBikeId]);

  useEffect(() => {
    if (!selectedRideBikeId && primaryBike?.id) {
      setSelectedRideBikeId(primaryBike.id);
    }
  }, [primaryBike?.id, selectedRideBikeId]);

  useEffect(() => {
    if (params.autoStart === 'true' && primaryBike && !showRidePicker) {
      const fuelRate = estimateFuelRate(primaryBike.engine_cc, primaryBike.category, 'hustle');
      const fuelPrice = customFuelPricePerLiter ?? dashboardMetrics.data?.latest_fuel_price ?? 65;
      setActiveBikeId(primaryBike.id);
      router.push({
        pathname: '/(app)/ride/active',
        params: { bikeId: primaryBike.id, fuelPrice, fuelRate },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [primaryBike]);

  useFocusEffect(
    useCallback(() => {
      if (secondaryReady) {
        return undefined;
      }

      const task = InteractionManager.runAfterInteractions(() => {
        setSecondaryReady(true);
        console.info('[bootstrap] ride_tab_secondary_ready');
      });

      return () => task.cancel();
    }, [secondaryReady]),
  );

  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    if (!secondaryReady) {
      setSecondaryReady(true);
    }
    setIsRefreshing(true);
    try {
      await syncPendingRides.mutateAsync();
      const refetches = [
        (rides as { refetch?: () => Promise<unknown> }).refetch,
        (recentRides as { refetch?: () => Promise<unknown> }).refetch,
        (dashboardMetrics as { refetch?: () => Promise<unknown> }).refetch,
        (weather as { refetch?: () => Promise<unknown> }).refetch,
        (weatherWindow as { refetch?: () => Promise<unknown> }).refetch,
        cachedLocation.refetch,
      ].filter(Boolean) as (() => Promise<unknown>)[];
      await Promise.all(refetches.map((refetch) => refetch()));
    } finally {
      setIsRefreshing(false);
    }
  }, [cachedLocation, dashboardMetrics, recentRides, rides, secondaryReady, syncPendingRides, weather, weatherWindow]);

  const baseFuelPrice = customFuelPricePerLiter ?? dashboardMetrics.data?.latest_fuel_price ?? 65;
  const latestRide = dashboardMetrics.data
    ? {
        distance_km: dashboardMetrics.data.latest_ride_distance_km,
        max_speed_kmh: dashboardMetrics.data.latest_ride_max_speed_kmh,
        fuel_used_liters: dashboardMetrics.data.latest_ride_fuel_used_liters,
      }
    : null;
  const todaysNet = useMemo(() => (
    workMode ? {
      gross: dashboardMetrics.data?.today_earnings ?? 0,
      fuelCost: dashboardMetrics.data?.today_fuel_cost ?? 0,
      net: (dashboardMetrics.data?.today_earnings ?? 0) - (dashboardMetrics.data?.today_fuel_cost ?? 0),
      count: dashboardMetrics.data?.today_trip_count ?? 0,
    } : null
  ), [
    dashboardMetrics.data?.today_earnings,
    dashboardMetrics.data?.today_fuel_cost,
    dashboardMetrics.data?.today_trip_count,
    workMode,
  ]);

  const monthlyCost = {
    fuelCost: dashboardMetrics.data?.month_fuel_cost ?? 0,
    maintenanceAccrual: dashboardMetrics.data?.month_maintenance_accrual ?? 0,
    totalCost: dashboardMetrics.data?.month_total_cost ?? 0,
    distanceKm: dashboardMetrics.data?.month_distance_km ?? 0,
    costPerKm: dashboardMetrics.data?.month_cost_per_km ?? 0,
  };

  const efficiencyTrend = useMemo(() => computeEfficiencyTrend(rides.data ?? []), [rides.data]);
  const personalRecords = useMemo(() => computePersonalRecords(rides.data ?? []), [rides.data]);

  const selectedRideBike = useMemo(
    () => allBikes.find((bike) => bike.id === selectedRideBikeId) ?? primaryBike,
    [allBikes, primaryBike, selectedRideBikeId],
  );
  const selectedRideFuelRate = useMemo(
    () => estimateFuelRate(selectedRideBike?.engine_cc, selectedRideBike?.category, 'hustle'),
    [selectedRideBike?.category, selectedRideBike?.engine_cc],
  );

  const openRidePicker = useCallback(() => {
    if (!primaryBike) {
      router.push('/(public)/bike-setup');
      return;
    }

    setSelectedRideBikeId(primaryBike.id);
    setShowRidePicker(true);
  }, [primaryBike]);

  const startRide = useCallback(() => {
    if (!selectedRideBike) {
      router.push('/(public)/bike-setup');
      return;
    }

    setActiveBikeId(selectedRideBike.id);
    setShowRidePicker(false);
    router.push({
      pathname: '/(app)/ride/active',
      params: { bikeId: selectedRideBike.id, fuelPrice: baseFuelPrice, fuelRate: selectedRideFuelRate },
    });
  }, [baseFuelPrice, selectedRideBike, selectedRideFuelRate, setActiveBikeId]);

  const openNearbySearch = useCallback(async (category: 'gas station' | 'restaurant') => {
    try {
      const location = cachedLocation.data;
      const query = location && !location.isFallback
        ? encodeURIComponent(`${category} near ${location.lat.toFixed(5)},${location.lng.toFixed(5)}`)
        : encodeURIComponent(category === 'restaurant' ? 'restaurants near me' : 'gas stations near me');
      const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${query}`;
      await Linking.openURL(googleMapsUrl);
    } catch (error) {
      Alert.alert('Could not open maps', error instanceof Error ? error.message : 'Please try again.');
    }
  }, [cachedLocation]);

  const heroTile = useMemo(() => (
    workMode && todaysNet ? (
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
                {Math.round(((todaysNet.gross || 0) / dailyEarningsGoal) * 100)}% of {formatCurrencyPhp(dailyEarningsGoal)}
              </AppText>
            </View>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: palette.surfaceMuted, overflow: 'hidden' }}>
              <View
                style={{
                  width: `${Math.min(100, ((todaysNet.gross || 0) / dailyEarningsGoal) * 100)}%`,
                  height: '100%',
                  backgroundColor: palette.success,
                }}
              />
            </View>
          </View>
        ) : null}
        <Button title="Start Shift  →" onPress={openRidePicker} style={{ borderRadius: 13, minHeight: 52 }} />
      </GlassCard>
    ) : (
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
          <StatCard label="Last Ride" value={latestRide?.distance_km.toFixed(1) ?? '0.0'} unit="km" />
          <StatCard label="Top Speed" value={latestRide?.max_speed_kmh.toFixed(0) ?? '0'} unit="km/h" />
          <StatCard label="Fuel" value={latestRide?.fuel_used_liters?.toFixed(1) ?? '0.0'} unit="L" />
        </View>
        <Button title="Start Ride  →" onPress={openRidePicker} style={{ borderRadius: 13, minHeight: 52 }} />
      </GlassCard>
    )
  ), [dailyEarningsGoal, latestRide?.distance_km, latestRide?.fuel_used_liters, latestRide?.max_speed_kmh, openRidePicker, ridingPersona, todaysNet, workMode]);

  const monthlyCostTile = useMemo(() => (
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
  ), [monthlyCost.costPerKm, monthlyCost.distanceKm, monthlyCost.fuelCost, monthlyCost.maintenanceAccrual, monthlyCost.totalCost]);

  const proximityTile = useMemo(() => (
    <GlassCard style={{ padding: 18, borderRadius: 18, gap: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <AppText variant="eyebrow">NEARBY</AppText>
        <MaterialCommunityIcons name="map-marker-radius-outline" size={18} color={palette.textSecondary} />
      </View>
      <AppText variant="body" style={{ color: palette.textSecondary }}>
        Need a quick stop? Jump straight to gas stations or food nearby in your maps app.
      </AppText>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Button title="Gas Stations" variant="secondary" onPress={() => void openNearbySearch('gas station')} />
        </View>
        <View style={{ flex: 1 }}>
          <Button title="Restaurants" variant="secondary" onPress={() => void openNearbySearch('restaurant')} />
        </View>
      </View>
    </GlassCard>
  ), [openNearbySearch]);

  const recentRideItems = useMemo<RideTabItem[]>(() => {
    if (!recentRides.data?.length) {
      return [{ type: 'empty', key: 'rides-empty' }];
    }

    return recentRides.data.map((ride) => ({ type: 'ride', key: `ride-${ride.id}`, ride }));
  }, [recentRides.data]);

  const tileItems = useMemo(() => {
    const tiles: RideTabItem[] = [
      { type: 'tile', key: 'hero', content: heroTile },
    ];

    if (!secondaryReady) {
      tiles.push({
        type: 'tile',
        key: 'loading-shell',
        content: (
          <GlassCard style={{ padding: 18, borderRadius: 18, gap: 8 }}>
            <AppText variant="eyebrow">LOADING RIDE INSIGHTS</AppText>
            <AppText variant="body" style={{ color: palette.textSecondary }}>
              Bringing in your recent rides, weather, and maintenance snapshot.
            </AppText>
          </GlassCard>
        ),
      });
      tiles.push({ type: 'tile', key: 'nearby', content: proximityTile });
      return tiles;
    }

    if (!workMode && weatherWindow.data?.window) {
      tiles.push({
        type: 'tile',
        key: 'weather-window',
        content: <WeatherWindowCard window={weatherWindow.data.window} />,
      });
    }

    tiles.push({ type: 'tile', key: 'nearby', content: proximityTile });

    if (!workMode) {
      tiles.push({
        type: 'tile',
        key: 'milestone',
        content: <BikeMilestoneCard bike={primaryBike} />,
      });
      tiles.push({
        type: 'tile',
        key: 'records',
        content: <PersonalRecordsCard records={personalRecords} />,
      });
    }

    tiles.push({
      type: 'tile',
      key: 'heatmap',
      content: (
        <GlassCard style={{ paddingTop: 8, paddingBottom: 6, paddingHorizontal: 10, borderRadius: 18 }}>
          <CustomCalendarHeatmap rides={rides.data ?? []} numDays={90} />
        </GlassCard>
      ),
    });

    tiles.push({
      type: 'tile',
      key: 'efficiency',
      content: <EfficiencyTrendCard trend={efficiencyTrend} />,
    });

    tiles.push({
      type: 'tile',
      key: 'maintenance',
      content: <UpcomingMaintenanceCard />,
    });

    tiles.push({ type: 'tile', key: 'monthly-cost', content: monthlyCostTile });
    tiles.push({ type: 'section', key: 'recent-section' });
    return [...tiles, ...recentRideItems];
  }, [efficiencyTrend, heroTile, monthlyCostTile, personalRecords, primaryBike, proximityTile, recentRideItems, rides.data, secondaryReady, weatherWindow.data?.window, workMode]);

  const renderHeader = useCallback(() => (
    <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 16 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <AppText variant="brand">KURBADA</AppText>
        {secondaryReady ? (
          <WeatherWidget weather={weather.data} isError={weather.isError} />
        ) : (
          <AppText variant="meta" style={{ color: palette.textTertiary }}>
            Loading weather…
          </AppText>
        )}
      </View>

      <View style={{ gap: 6 }}>
        <AppText variant="eyebrow">{getGreeting()}, {profile.data?.display_name ?? 'Rider'}</AppText>
        <AppText variant="screenTitle" style={{ fontSize: 34, lineHeight: 38, letterSpacing: -0.8 }}>
          {workMode ? 'Your shift, your numbers.' : 'Ride honest. Ride smart.'}
        </AppText>
        <AppText variant="body">
          {workMode
            ? 'Earnings, fuel, and net income — tracked as you ride.'
            : 'Your route, fuel cost, and maintenance — the whole truth of owning a motorcycle.'}
        </AppText>
      </View>

      {allBikes.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingBottom: 8 }}
          keyboardShouldPersistTaps="handled">
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
                  style={{ fontSize: 12, color: active ? palette.background : palette.textSecondary, maxWidth: 120 }}>
                  {bike.nickname?.trim() || `${bike.make} ${bike.model}`}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  ), [allBikes, primaryBike?.id, profile.data?.display_name, secondaryReady, setActiveBikeId, weather.data, weather.isError, workMode]);

  const renderItem = useCallback(({ item }: { item: RideTabItem }) => {
    if (item.type === 'tile') {
      return <View style={{ paddingHorizontal: 20 }}>{item.content}</View>;
    }

    if (item.type === 'section') {
      return (
        <View style={{ paddingHorizontal: 20 }}>
          <SectionHeader title="Recent Rides" action={<AppText variant="meta" style={{ color: palette.textTertiary }}>See all</AppText>} />
        </View>
      );
    }

    if (item.type === 'empty') {
      return (
        <View style={{ paddingHorizontal: 20 }}>
          <GlassCard style={{ padding: 18 }}>
            <EmptyState icon="map-outline" title="No saved rides" body="Your ride feed will build into a timeline of routes and cost once you start tracking." />
          </GlassCard>
        </View>
      );
    }

    const bike = bikesById.get(item.ride.bike_id);
    const bikeLabel = bike ? bike.nickname?.trim() || `${bike.make} ${bike.model}` : '';

    return (
      <View style={{ paddingHorizontal: 20 }}>
        <RideFeedCard
          ride={item.ride}
          bikeLabel={bikeLabel}
          onPress={() => router.push({ pathname: '/(app)/ride/summary', params: { rideId: item.ride.id } })}
          onShare={() => router.push({ pathname: '/(app)/ride/summary', params: { rideId: item.ride.id } })}
        />
      </View>
    );
  }, [bikesById]);

  return (
    <TabTransition>
      <AppScreen showWordmark={false} style={{ paddingHorizontal: 0, paddingTop: 0 }}>
        <FlashList
          data={tileItems}
          renderItem={renderItem}
          keyExtractor={(item) => item.key}
          ListHeaderComponent={renderHeader}
          ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
          contentContainerStyle={{ paddingBottom: 120, paddingTop: 0 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={palette.text}
              colors={[palette.danger]}
              progressBackgroundColor={palette.surfaceStrong}
            />
          }
        />

        <KeyboardSheet
          visible={showRidePicker}
          onClose={() => setShowRidePicker(false)}
          title="Choose bike for this ride"
          subtitle="We’ll log the kilometers and fuel estimate against the motorcycle you pick here.">
          <View style={{ gap: 10 }}>
            {allBikes.map((bike) => {
              const active = bike.id === selectedRideBike?.id;
              const estimatedRate = estimateFuelRate(bike.engine_cc, bike.category, 'hustle');
              return (
                <Pressable
                  key={bike.id}
                  onPress={() => setSelectedRideBikeId(bike.id)}
                  style={{
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: active ? palette.danger : palette.border,
                    backgroundColor: active ? 'rgba(230,57,70,0.12)' : palette.surfaceMuted,
                    paddingHorizontal: 14,
                    paddingVertical: 14,
                    gap: 8,
                  }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <AppText variant="bodyBold">
                        {bike.nickname?.trim() || `${bike.make} ${bike.model}`}
                      </AppText>
                      <AppText variant="meta" style={{ color: palette.textSecondary }}>
                        {bike.year} · {bike.engine_cc}cc · {bike.current_odometer_km.toLocaleString()} km
                      </AppText>
                    </View>
                    {active ? (
                      <MaterialCommunityIcons name="check-circle" size={18} color={palette.danger} />
                    ) : null}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <StatCard label="Fuel Price" value={`₱${baseFuelPrice.toFixed(0)}`} unit="/L" />
                    <StatCard label="Fuel Rate" value={estimatedRate.toFixed(0)} unit="km/L" />
                  </View>
                </Pressable>
              );
            })}
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Button title="Cancel" variant="ghost" onPress={() => setShowRidePicker(false)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Start Ride" onPress={startRide} style={{ borderRadius: 13, minHeight: 48 }} />
            </View>
          </View>
        </KeyboardSheet>
      </AppScreen>
    </TabTransition>
  );
}
