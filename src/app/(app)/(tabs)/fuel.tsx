import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { AppScrollScreen } from '@/components/ui/app-screen';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { FloatingField } from '@/components/ui/floating-field';
import { GlassCard } from '@/components/ui/glass-card';
import { SectionHeader } from '@/components/ui/section-header';
import { TabTransition } from '@/components/navigation/tab-transition';
import { FuelEntryCard } from '@/features/fuel/components/fuel-entry-card';
import { FuelSummaryCard } from '@/features/fuel/components/fuel-summary-card';
import { palette, radius } from '@/constants/theme';
import { formatCurrencyPhp } from '@/lib/format';
import { triggerLightHaptic, triggerSuccessHaptic, triggerWarningHaptic } from '@/lib/haptics';
import { useAuth } from '@/hooks/use-auth';
import { useBikes, useFuelLogs, useFuelMutations } from '@/hooks/use-kurbada-data';
import type { FuelLog } from '@/types/domain';

export default function FuelTabScreen() {
  const { session } = useAuth();
  const bikes = useBikes(session?.user.id);
  const fuelLogs = useFuelLogs(session?.user.id);
  const { saveFuelLog, deleteFuelLog } = useFuelMutations(session?.user.id);
  const [showForm, setShowForm] = useState(false);
  const [liters, setLiters] = useState('');
  const [price, setPrice] = useState('');
  const [station, setStation] = useState('');
  const [octane, setOctane] = useState<'91' | '95' | '97' | '100'>('95');
  const formProgress = useRef(new Animated.Value(0)).current;
  const currentBike = bikes.data?.[0];
  const resetForm = useCallback(() => {
    setLiters('');
    setPrice('');
    setStation('');
    setOctane('95');
  }, []);

  const summary = useMemo(() => {
    const logs = fuelLogs.data ?? [];
    const total = logs.reduce((sum, item) => sum + item.total_cost, 0);
    const litersTotal = logs.reduce((sum, item) => sum + item.liters, 0);
    return {
      total,
      litersTotal,
      avgPrice: litersTotal ? total / litersTotal : 0,
    };
  }, [fuelLogs.data]);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const refetches = [
        (fuelLogs as { refetch?: () => Promise<unknown> }).refetch,
        (bikes as { refetch?: () => Promise<unknown> }).refetch,
      ].filter(Boolean) as (() => Promise<unknown>)[];
      await Promise.all(refetches.map((fn) => fn()));
    } finally {
      setIsRefreshing(false);
    }
  }, [fuelLogs, bikes]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(formProgress, {
        toValue: showForm ? 1 : 0,
        duration: showForm ? 220 : 180,
        useNativeDriver: false,
      }),
    ]).start();
  }, [formProgress, showForm]);

  const formTranslateY = formProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [18, 0],
  });

  const formHeight = formProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const handleEntryPress = useCallback((item: FuelLog) => {
    Alert.alert(
      `${item.liters.toFixed(1)}L · Octane ${item.octane_rating}`,
      [
        item.station_name ?? 'Fuel stop',
        item.logged_at,
        formatCurrencyPhp(item.total_cost),
      ].join('\n'),
      [{ text: 'Close', style: 'cancel' }],
    );
  }, []);

  const handleDeleteEntry = useCallback((item: FuelLog) => {
    triggerWarningHaptic();
    Alert.alert(
      'Delete fuel entry?',
      'This log will be removed from your fuel history.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteFuelLog.mutate(item.id),
        },
      ],
    );
  }, [deleteFuelLog]);

  return (
    <TabTransition>
      <AppScrollScreen refreshing={isRefreshing} onRefresh={handleRefresh}>
      <View style={{ gap: 8 }}>
        <AppText variant="eyebrow">Fuel Ledger</AppText>
        <AppText variant="screenTitle">Ownership has a cost. Make it look good.</AppText>
        <AppText variant="body">Track your fill-ups like part of the machine story, not an accounting spreadsheet.</AppText>
      </View>

      <SectionHeader title="Fuel Ledger" action={<Button title="+ Log" variant="secondary" onPress={() => setShowForm((value) => !value)} />} />

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <FuelSummaryCard label="This Month" value={formatCurrencyPhp(summary.total)} caption="Total fuel spend" />
        <FuelSummaryCard label="Avg ₱ / L" value={summary.avgPrice.toFixed(0)} caption="Pump average" />
      </View>
      <View style={{ flexDirection: 'row', gap: 12, marginTop: -16 }}>
        <FuelSummaryCard label="Avg L/100KM" value={summary.litersTotal > 0 ? ((summary.litersTotal / Math.max(1, fuelLogs.data?.length ?? 1)) * 10).toFixed(1) : '0.0'} caption="Consumption trend" />
        <FuelSummaryCard label="Rides Fueled" value={`${fuelLogs.data?.length ?? 0}`} caption="Logged fill-ups" />
      </View>

      <Animated.View
        pointerEvents={showForm ? 'auto' : 'none'}
        style={{
          opacity: formProgress,
          transform: [{ translateY: formTranslateY }],
          maxHeight: formHeight.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 420],
          }),
          overflow: 'hidden',
        }}>
        <GlassCard style={{ padding: 18, gap: 10 }}>
          <FloatingField label="Liters" value={liters} onChangeText={setLiters} placeholder="7.0" keyboardType="decimal-pad" />
          <FloatingField label="Price per Liter" value={price} onChangeText={setPrice} placeholder="66" keyboardType="decimal-pad" />
          <FloatingField label="Station Name" value={station} onChangeText={setStation} placeholder="Shell Katipunan" />
          <AppText variant="label" style={{ color: palette.textSecondary, fontSize: 12 }}>
            Octane
          </AppText>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['91', '95', '97', '100'] as const).map((value) => (
              <Pressable
                key={value}
                onPress={() => {
                  triggerLightHaptic();
                  setOctane(value);
                }}
                style={{
                  flex: 1,
                  borderRadius: radius.sm,
                  paddingVertical: 10,
                  backgroundColor: octane === value ? palette.surfaceStrong : palette.surface,
                  borderWidth: 0.5,
                  borderColor: octane === value ? palette.dividerStrong : palette.border,
                  alignItems: 'center',
                }}>
                <AppText variant="button" style={{ color: octane === value ? palette.text : palette.textSecondary }}>
                  {value}
                </AppText>
              </Pressable>
            ))}
          </View>
          <Button
            title="Save Entry"
            onPress={async () => {
              if (!currentBike) {
                return;
              }
              const litersValue = Number(liters);
              const priceValue = Number(price);
              await saveFuelLog.mutateAsync({
                id: '',
                bike_id: currentBike.id,
                logged_at: new Date().toISOString().slice(0, 10),
                liters: litersValue,
                price_per_liter: priceValue,
                total_cost: litersValue * priceValue,
                octane_rating: Number(octane) as 91 | 95 | 97 | 100,
                station_name: station,
              });
              triggerSuccessHaptic();
              resetForm();
              setShowForm(false);
            }}
          />
        </GlassCard>
      </Animated.View>

      <SectionHeader
        title="Entries"
        action={(
          <Pressable onPress={() => router.push('/(app)/fuel/reports')}>
            <AppText variant="button" style={{ color: palette.textTertiary, fontSize: 13 }}>
              Reports
            </AppText>
          </Pressable>
        )}
      />
      {fuelLogs.data?.length ? (
        <View style={{ gap: 12 }}>
          {fuelLogs.data.map((item) => (
            <FuelEntryCard
              key={item.id}
              entry={item}
              onPress={() => handleEntryPress(item)}
              onLongPress={() => handleDeleteEntry(item)}
            />
          ))}
        </View>
      ) : (
        <GlassCard style={{ padding: 18 }}>
          <EmptyState icon="water-outline" title="No fuel logs yet" body="Log your first fill-up to start a cleaner machine ledger and unlock spending rhythm." />
        </GlassCard>
      )}
    </AppScrollScreen>
    </TabTransition>
  );
}
