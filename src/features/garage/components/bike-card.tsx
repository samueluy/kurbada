import { ChevronRight, Gauge, Route, Warehouse } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { GlassCard } from '@/components/ui/glass-card';
import { AppText } from '@/components/ui/app-text';
import { palette, radius } from '@/constants/theme';
import type { Bike } from '@/types/domain';

export function BikeCard({ bike, onPress }: { bike: Bike; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.988 : 1 }] }]}>
      <GlassCard style={{ padding: 18, gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ width: 56, height: 56, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' }}>
            <Warehouse size={24} color={palette.text} />
          </View>
          <ChevronRight size={18} color={palette.textSecondary} />
        </View>
        <View style={{ gap: 4 }}>
          <AppText variant="sectionTitle">{bike.make} {bike.model}</AppText>
          <AppText variant="meta">{bike.year} • {bike.engine_cc} cc • {bike.category}</AppText>
        </View>
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Route size={14} color={palette.textSecondary} />
            <AppText variant="meta">{bike.current_odometer_km.toLocaleString()} km</AppText>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Gauge size={14} color={palette.textSecondary} />
            <AppText variant="meta">Mounted for road telemetry</AppText>
          </View>
        </View>
      </GlassCard>
    </Pressable>
  );
}
