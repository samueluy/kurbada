import { GlassCard } from '@/components/ui/glass-card';
import { AppText } from '@/components/ui/app-text';
import { palette } from '@/constants/theme';

export function FuelSummaryCard({
  label,
  value,
  caption,
}: {
  label: string;
  value: string;
  caption?: string;
}) {
  return (
    <GlassCard style={{ flex: 1, padding: 16, gap: 8 }}>
      <AppText variant="label">{label}</AppText>
      <AppText variant="cardMetric">{value}</AppText>
      {caption ? <AppText variant="meta" style={{ color: palette.textSecondary }}>{caption}</AppText> : null}
    </GlassCard>
  );
}
