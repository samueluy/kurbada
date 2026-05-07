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
    <GlassCard style={{ flex: 1, padding: 14, gap: 6, borderRadius: 14 }}>
      <AppText variant="label">{label}</AppText>
      <AppText variant="cardMetric" style={{ fontSize: 22, lineHeight: 24 }}>{value}</AppText>
      {caption ? <AppText variant="meta" style={{ color: palette.textTertiary, fontSize: 11 }}>{caption}</AppText> : null}
    </GlassCard>
  );
}
