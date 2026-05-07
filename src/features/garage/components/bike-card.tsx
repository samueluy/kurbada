import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ChevronRight, Gauge, Route } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { GlassCard } from '@/components/ui/glass-card';
import { AppText } from '@/components/ui/app-text';
import { palette, radius } from '@/constants/theme';
import type { Bike } from '@/types/domain';

export function BikeCard({ bike, onPress, onLongPress }: { bike: Bike; onPress?: () => void; onLongPress?: () => void }) {
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
          <View style={{ flex: 1, gap: 4 }}>
            <AppText variant="h2">{bike.make} {bike.model}</AppText>
            <AppText variant="meta">{bike.year} · {bike.engine_cc} cc · {bike.category}</AppText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Route size={12} color={palette.textSecondary} />
              <AppText variant="meta">{bike.current_odometer_km.toLocaleString()} km</AppText>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Gauge size={12} color={palette.textSecondary} />
              <AppText variant="meta">Mounted for road telemetry</AppText>
            </View>
          </View>
          <ChevronRight size={18} color={palette.textSecondary} />
        </View>
      </GlassCard>
    </Pressable>
  );
}
