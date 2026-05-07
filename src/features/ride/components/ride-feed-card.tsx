import { Gauge, Share2, Timer } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { GlassCard } from '@/components/ui/glass-card';
import { AppText } from '@/components/ui/app-text';
import { RideMapThumbnail } from '@/components/ride/ride-map-thumbnail';
import { formatDateLabel, formatModeLabel } from '@/lib/format';
import { palette } from '@/constants/theme';
import type { RideRecord } from '@/types/domain';

export function RideFeedCard({ ride, onPress, onShare }: { ride: RideRecord; onPress?: () => void; onShare?: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}>
      <GlassCard style={{ padding: 14, gap: 12 }}>
        <RideMapThumbnail ride={ride} />
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <AppText variant="h3">{formatModeLabel(ride.mode)}</AppText>
              <AppText variant="meta">{formatDateLabel(ride.started_at)}</AppText>
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Gauge size={14} color={palette.textSecondary} />
              <AppText variant="meta">{ride.max_speed_kmh.toFixed(0)} km/h</AppText>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Timer size={14} color={palette.textSecondary} />
              <AppText variant="meta">{ride.distance_km.toFixed(1)} km</AppText>
            </View>
          </View>
        </View>
      </GlassCard>
    </Pressable>
  );
}
