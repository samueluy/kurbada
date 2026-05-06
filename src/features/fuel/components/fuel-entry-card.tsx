import { Droplets, MapPinned } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { GlassCard } from '@/components/ui/glass-card';
import { AppText } from '@/components/ui/app-text';
import { palette, radius } from '@/constants/theme';
import { formatCurrencyPhp } from '@/lib/format';
import type { FuelLog } from '@/types/domain';

export function FuelEntryCard({ entry, onPress }: { entry: FuelLog; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}>
      <GlassCard style={{ padding: 16, gap: 12 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ gap: 4 }}>
            <AppText variant="bodyBold">{entry.station_name ?? 'Fuel stop'}</AppText>
            <AppText variant="meta">{entry.logged_at}</AppText>
          </View>
          <AppText variant="cardMetric" style={{ color: palette.text }}>{formatCurrencyPhp(entry.total_cost)}</AppText>
        </View>
        <View style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Droplets size={14} color={palette.textSecondary} />
            <AppText variant="meta">{entry.liters.toFixed(1)} L</AppText>
          </View>
          <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.06)' }}>
            <AppText variant="label" style={{ color: palette.text }}>{entry.octane_rating}</AppText>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MapPinned size={14} color={palette.textSecondary} />
            <AppText variant="meta">{entry.price_per_liter.toFixed(0)} / L</AppText>
          </View>
        </View>
      </GlassCard>
    </Pressable>
  );
}
