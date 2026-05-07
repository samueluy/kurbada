import { ChevronRight, Droplets } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { GlassCard } from '@/components/ui/glass-card';
import { AppText } from '@/components/ui/app-text';
import { palette, radius } from '@/constants/theme';
import { formatCurrencyPhp } from '@/lib/format';
import type { FuelLog } from '@/types/domain';

export function FuelEntryCard({ entry, onPress }: { entry: FuelLog; onPress?: () => void }) {
  const octaneStyle =
    entry.octane_rating >= 100
      ? { backgroundColor: 'rgba(192,57,43,0.15)', color: palette.danger }
      : entry.octane_rating === 97
        ? { backgroundColor: 'rgba(52,152,219,0.15)', color: '#3498DB' }
        : entry.octane_rating === 95
          ? { backgroundColor: 'rgba(46,204,113,0.15)', color: palette.success }
          : { backgroundColor: palette.surfaceStrong, color: palette.textTertiary };

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.92 : 1 }]}>
      <GlassCard style={{ padding: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 36, height: 36, borderRadius: radius.md, backgroundColor: palette.surfaceMuted, alignItems: 'center', justifyContent: 'center' }}>
            <Droplets size={16} color={palette.text} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <AppText variant="h3">{entry.liters.toFixed(1)}L · Octane {entry.octane_rating}</AppText>
              <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.xs, backgroundColor: octaneStyle.backgroundColor }}>
                <AppText variant="label" style={{ color: octaneStyle.color, letterSpacing: 0.8 }}>{entry.octane_rating}</AppText>
              </View>
            </View>
            <AppText variant="meta">{entry.logged_at} · {entry.station_name ?? 'Fuel stop'}</AppText>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <AppText variant="mono">{formatCurrencyPhp(entry.total_cost)}</AppText>
            <ChevronRight size={14} color={palette.textTertiary} />
          </View>
        </View>
      </GlassCard>
    </Pressable>
  );
}
