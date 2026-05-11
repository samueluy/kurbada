import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { GlassCard } from '@/components/ui/glass-card';
import { palette } from '@/constants/theme';
import type { EfficiencyTrend } from '@/lib/efficiency-trend';

export function EfficiencyTrendCard({ trend }: { trend: EfficiencyTrend }) {
  const color =
    trend.direction === 'better' ? palette.success : trend.direction === 'worse' ? palette.danger : palette.text;
  const iconName =
    trend.direction === 'better'
      ? 'trending-up-outline'
      : trend.direction === 'worse'
        ? 'trending-down-outline'
        : 'remove-outline';

  return (
    <GlassCard style={{ padding: 18, borderRadius: 18, gap: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <AppText variant="eyebrow">FUEL EFFICIENCY · 7-DAY TREND</AppText>
        <Ionicons name={iconName} size={18} color={color} />
      </View>
      {trend.direction === 'insufficient_data' || trend.currentKmPerLiter === null ? (
        <AppText variant="meta" style={{ color: palette.textSecondary }}>
          {trend.hint}
        </AppText>
      ) : (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
            <AppText variant="heroMetric" style={{ fontSize: 36, lineHeight: 42, color }}>
              {trend.currentKmPerLiter.toFixed(1)}
            </AppText>
            <AppText variant="meta" style={{ color: palette.textTertiary }}>
              km/L
            </AppText>
            {trend.percentChange !== null ? (
              <AppText variant="meta" style={{ color, marginLeft: 'auto' }}>
                {trend.percentChange > 0 ? '+' : ''}
                {trend.percentChange.toFixed(1)}%
              </AppText>
            ) : null}
          </View>
          <AppText variant="meta" style={{ color: palette.textSecondary }}>
            {trend.hint}
          </AppText>
        </>
      )}
    </GlassCard>
  );
}
