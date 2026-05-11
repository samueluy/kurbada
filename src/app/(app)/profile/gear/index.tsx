import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { AppScrollScreen } from '@/components/ui/app-screen';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { GlassCard } from '@/components/ui/glass-card';
import { palette, radius } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useBikes, useGearItems, useGearMutations } from '@/hooks/use-kurbada-data';
import { computeGearHealth, GEAR_CATEGORY_LABELS } from '@/lib/gear';
import type { GearItem } from '@/types/domain';

function GearRow({
  item,
  bikeLookup,
  onPress,
  onDelete,
}: {
  item: GearItem;
  bikeLookup: Map<string, { make: string; model: string; current_odometer_km: number }>;
  onPress: () => void;
  onDelete: () => void;
}) {
  const bike = item.bike_id ? bikeLookup.get(item.bike_id) : undefined;
  const health = computeGearHealth(item, bike as any);
  const pct = Math.round(health.percentRemaining * 100);
  const barColor = health.overdue
    ? palette.danger
    : health.dueSoon
      ? '#F39C12'
      : palette.success;

  return (
    <Pressable onPress={onPress}>
      <GlassCard style={{ padding: 16, gap: 10, borderRadius: radius.lg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <AppText variant="bodyBold" numberOfLines={1}>
              {item.name}
            </AppText>
            <AppText variant="meta" style={{ color: palette.textSecondary }}>
              {GEAR_CATEGORY_LABELS[item.category]}
              {bike ? ` · ${bike.make} ${bike.model}` : ''}
            </AppText>
          </View>
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              onDelete();
            }}
            hitSlop={8}
            style={{ padding: 4 }}>
            <Ionicons name="trash-outline" size={16} color={palette.textTertiary} />
          </Pressable>
        </View>
        {health.reason !== 'none' ? (
          <>
            <View style={{ height: 6, borderRadius: 3, backgroundColor: palette.surfaceMuted, overflow: 'hidden' }}>
              <View
                style={{
                  width: `${pct}%`,
                  height: '100%',
                  backgroundColor: barColor,
                }}
              />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <AppText variant="meta" style={{ color: palette.textTertiary, fontSize: 11 }}>
                {pct}% life remaining
              </AppText>
              <AppText
                variant="label"
                style={{ color: health.overdue ? palette.danger : health.dueSoon ? '#F39C12' : palette.textSecondary, fontSize: 10 }}>
                {health.statusLabel.toUpperCase()}
              </AppText>
            </View>
          </>
        ) : (
          <AppText variant="meta" style={{ color: palette.textTertiary, fontSize: 11 }}>
            No lifetime set — tap to edit.
          </AppText>
        )}
      </GlassCard>
    </Pressable>
  );
}

export default function GearScreen() {
  const { session } = useAuth();
  const gear = useGearItems(session?.user.id);
  const bikes = useBikes(session?.user.id);
  const { deleteGearItem } = useGearMutations(session?.user.id);

  const bikeLookup = useMemo(() => {
    const map = new Map<string, { make: string; model: string; current_odometer_km: number }>();
    (bikes.data ?? []).forEach((b) => {
      map.set(b.id, { make: b.make, model: b.model, current_odometer_km: b.current_odometer_km });
    });
    return map;
  }, [bikes.data]);

  const handleDelete = (item: GearItem) => {
    Alert.alert(`Delete ${item.name}?`, 'You can always add it back later.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteGearItem.mutate(item.id) },
    ]);
  };

  return (
    <AppScrollScreen showWordmark={false}>
      <View style={{ gap: 8 }}>
        <AppText variant="eyebrow">Gear</AppText>
        <AppText variant="screenTitle" style={{ fontSize: 28 }}>
          Your riding gear.
        </AppText>
        <AppText variant="body" style={{ color: palette.textSecondary }}>
          Helmet, jacket, gloves, tires — track their install date and get a heads-up before they&apos;re worn out.
        </AppText>
      </View>

      <Button
        title="+ Add gear"
        variant="secondary"
        onPress={() => router.push('/(app)/profile/gear/add' as any)}
      />

      {(gear.data ?? []).length === 0 ? (
        <GlassCard style={{ padding: 18 }}>
          <EmptyState
            icon="shirt-outline"
            title="No gear tracked yet"
            body="Start with your helmet. The 5-year replacement rule is built in."
            actionTitle="Add your first item"
            onAction={() => router.push('/(app)/profile/gear/add' as any)}
          />
        </GlassCard>
      ) : (
        <View style={{ gap: 10 }}>
          {(gear.data ?? []).map((item) => (
            <GearRow
              key={item.id}
              item={item}
              bikeLookup={bikeLookup}
              onPress={() =>
                router.push({ pathname: '/(app)/profile/gear/add', params: { gearId: item.id } } as any)
              }
              onDelete={() => handleDelete(item)}
            />
          ))}
        </View>
      )}

      <Button title="Back" variant="ghost" onPress={() => router.back()} />
    </AppScrollScreen>
  );
}
