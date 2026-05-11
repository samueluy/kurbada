import { Share2, Timer } from 'lucide-react-native';
import { memo } from 'react';
import { Pressable, View } from 'react-native';

import { GlassCard } from '@/components/ui/glass-card';
import { AppText } from '@/components/ui/app-text';
import { RideMapThumbnail } from '@/components/ride/ride-map-thumbnail';
import { MoodBadge } from '@/features/ride/components/mood-badge';
import { formatDateLabel } from '@/lib/format';
import { palette } from '@/constants/theme';
import type { RideRecord } from '@/types/domain';

function RideFeedCardImpl({ ride, onPress, onShare }: { ride: RideRecord; onPress?: () => void; onShare?: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}>
      <GlassCard style={{ padding: 14, gap: 12 }}>
        <RideMapThumbnail ride={ride} />
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
              <AppText variant="h3" numberOfLines={1} style={{ flexShrink: 0 }}>
                {ride.distance_km.toFixed(1)} km
              </AppText>
              <AppText variant="meta" numberOfLines={1} ellipsizeMode="tail" style={{ flex: 1, minWidth: 0 }}>{formatDateLabel(ride.started_at)}</AppText>
            </View>
            {onShare ? (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation?.();
                  onShare?.();
                }}
                hitSlop={8}
                style={{ padding: 4 }}>
                <Share2 size={15} color={palette.textTertiary} />
              </Pressable>
            ) : null}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Timer size={14} color={palette.textSecondary} />
              <AppText variant="meta">{ride.max_speed_kmh.toFixed(0)} km/h top</AppText>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <AppText variant="meta">{ride.avg_speed_kmh.toFixed(0)} km/h avg</AppText>
            </View>
            {ride.elevation_gain_m != null && ride.elevation_gain_m > 0 ? (
              <AppText variant="meta">{Math.round(ride.elevation_gain_m)}m climbed</AppText>
            ) : null}
            <MoodBadge mood={ride.mood} />
          </View>
        </View>
      </GlassCard>
    </Pressable>
  );
}

export const RideFeedCard = memo(RideFeedCardImpl);
