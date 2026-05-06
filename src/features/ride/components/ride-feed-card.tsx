import { Gauge, Timer } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { GlassCard } from '@/components/ui/glass-card';
import { AppText } from '@/components/ui/app-text';
import { RideMapThumbnail } from '@/components/ride/ride-map-thumbnail';
import { formatDateLabel, formatModeLabel } from '@/lib/format';
import { palette } from '@/constants/theme';
import type { RideRecord } from '@/types/domain';

export function RideFeedCard({ ride, onPress }: { ride: RideRecord; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}>
      <GlassCard style={{ padding: 14, gap: 12 }}>
        <RideMapThumbnail ride={ride} />
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <AppText variant="bodyBold">{formatModeLabel(ride.mode)}</AppText>
            <AppText variant="meta">{formatDateLabel(ride.started_at)}</AppText>
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
