import { CalendarDays, Gauge, MoveRight, Route } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { GlassCard } from '@/components/ui/glass-card';
import { AppText } from '@/components/ui/app-text';
import { RideMapThumbnail } from '@/components/ride/ride-map-thumbnail';
import { palette, radius } from '@/constants/theme';
import { formatDateLabel, formatModeLabel } from '@/lib/format';
import type { RideMode, RideRecord } from '@/types/domain';

export function RideHeroCard({
  ride,
  mode,
  onPress,
}: {
  ride: RideRecord;
  mode?: RideMode;
  onPress?: () => void;
}) {
  const displayMode = mode ?? ride.mode;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.985 : 1 }] }]}>
      <GlassCard style={{ padding: 16, gap: 16 }}>
        <View style={{ borderRadius: radius.md, overflow: 'hidden' }}>
          <RideMapThumbnail ride={ride} />
        </View>

        <View style={{ gap: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <CalendarDays size={14} color={palette.textSecondary} />
              <AppText variant="meta">{formatDateLabel(ride.started_at)}</AppText>
            </View>
            <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.xs, backgroundColor: palette.surfaceMuted }}>
              <AppText variant="label" style={{ color: palette.textSecondary, letterSpacing: 1 }}>
                {formatModeLabel(ride.mode)}
              </AppText>
            </View>
          </View>

          <AppText variant="h1" style={{ fontSize: 18, lineHeight: 24 }}>
            Your latest {displayMode} kept it lean.
          </AppText>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1, gap: 4 }}>
              <AppText variant="label">Distance</AppText>
              <AppText variant="largeMetric">{ride.distance_km.toFixed(1)}</AppText>
              <AppText variant="meta" style={{ color: palette.textTertiary }}>km</AppText>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <AppText variant="label">Top Speed</AppText>
              <AppText variant="largeMetric">{ride.max_speed_kmh.toFixed(0)}</AppText>
              <AppText variant="meta" style={{ color: palette.textTertiary }}>km/h</AppText>
            </View>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', gap: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Gauge size={14} color={palette.textSecondary} />
                <AppText variant="meta">{ride.max_lean_angle_deg?.toFixed(0) ?? '0'} deg</AppText>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Route size={14} color={palette.textSecondary} />
                <AppText variant="meta">{ride.distance_km.toFixed(1)} km</AppText>
              </View>
            </View>
            <MoveRight size={16} color={palette.text} />
          </View>
        </View>
      </GlassCard>
    </Pressable>
  );
}
