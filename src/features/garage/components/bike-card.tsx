import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ChevronRight, Gauge, Route } from 'lucide-react-native';
import { memo } from 'react';
import { Pressable, View } from 'react-native';

import { GlassCard } from '@/components/ui/glass-card';
import { AppText } from '@/components/ui/app-text';
import { palette, radius } from '@/constants/theme';
import type { Bike } from '@/types/domain';

function BikeCardImpl({ bike, onPress, onLongPress }: { bike: Bike; onPress?: () => void; onLongPress?: () => void }) {
  const iconName =
    bike.category === 'sport'
      ? 'motorbike'
      : bike.category === 'adventure'
        ? 'motorbike'
        : bike.category === 'scooter'
          ? 'scooter'
          : 'motorbike-electric';

  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.988 : 1 }] }]}>
      <GlassCard style={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ width: 48, height: 48, borderRadius: radius.md, backgroundColor: palette.surfaceMuted, alignItems: 'center', justifyContent: 'center' }}>
            <MaterialCommunityIcons name={iconName} size={26} color={palette.text} />
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <AppText variant="h2" numberOfLines={1} ellipsizeMode="tail">{bike.make} {bike.model}</AppText>
            <AppText variant="meta" numberOfLines={1} ellipsizeMode="tail">{bike.year} · {bike.engine_cc} cc · {bike.category}</AppText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Route size={12} color={palette.textSecondary} />
              <AppText variant="meta" numberOfLines={1} style={{ flex: 1, minWidth: 0 }}>{bike.current_odometer_km.toLocaleString()} km</AppText>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Gauge size={12} color={palette.textSecondary} />
              <AppText variant="meta" numberOfLines={1} style={{ flex: 1, minWidth: 0 }}>Mounted for road telemetry</AppText>
            </View>
          </View>
          <ChevronRight size={18} color={palette.textSecondary} style={{ flexShrink: 0 } as any} />
        </View>
      </GlassCard>
    </Pressable>
  );
}

export const BikeCard = memo(BikeCardImpl);
