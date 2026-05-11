import { CalendarDays, MoveRight, Route, Timer } from 'lucide-react-native';
import { memo } from 'react';
import { Pressable, View } from 'react-native';

import { GlassCard } from '@/components/ui/glass-card';
import { AppText } from '@/components/ui/app-text';
import { RideMapThumbnail } from '@/components/ride/ride-map-thumbnail';
import { palette, radius } from '@/constants/theme';
import { formatDateLabel } from '@/lib/format';
import type { RideRecord } from '@/types/domain';

function RideHeroCardImpl({
  ride,
  onPress,
}: {
  ride: RideRecord;
  onPress?: () => void;
}) {
  const durationSeconds = ride.started_at && ride.ended_at
    ? Math.max(0, Math.round((new Date(ride.ended_at).getTime() - new Date(ride.started_at).getTime()) / 1000))
    : 0;
  const durationMinutes = Math.round(durationSeconds / 60);

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
                LAST RIDE
              </AppText>
            </View>
          </View>

          <AppText variant="h1" numberOfLines={2} ellipsizeMode="tail" style={{ fontSize: 18, lineHeight: 24 }}>
            {ride.distance_km.toFixed(1)} km · {ride.max_speed_kmh.toFixed(0)} km/h top
          </AppText>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
              <AppText variant="label">Distance</AppText>
              <AppText variant="largeMetric" numberOfLines={1} adjustsFontSizeToFit>{ride.distance_km.toFixed(1)}</AppText>
              <AppText variant="meta" style={{ color: palette.textTertiary }}>km</AppText>
            </View>
            <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
              <AppText variant="label">Top Speed</AppText>
              <AppText variant="largeMetric" numberOfLines={1} adjustsFontSizeToFit>{ride.max_speed_kmh.toFixed(0)}</AppText>
              <AppText variant="meta" style={{ color: palette.textTertiary }}>km/h</AppText>
            </View>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', gap: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Timer size={14} color={palette.textSecondary} />
                <AppText variant="meta">{durationMinutes} min</AppText>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Route size={14} color={palette.textSecondary} />
                <AppText variant="meta">{ride.avg_speed_kmh.toFixed(0)} km/h avg</AppText>
              </View>
            </View>
            <MoveRight size={16} color={palette.text} />
          </View>
        </View>
      </GlassCard>
    </Pressable>
  );
}

export const RideHeroCard = memo(RideHeroCardImpl);
