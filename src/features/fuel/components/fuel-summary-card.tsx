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
  const numericValue = Number(value.replace(/[^\d.-]/g, ''));
  const valueColor = Number.isFinite(numericValue) && numericValue > 0 ? palette.text : palette.textTertiary;

  return (
    <GlassCard style={{ flex: 1, padding: 14, gap: 6, borderRadius: 14 }}>
      <AppText variant="label" numberOfLines={1} ellipsizeMode="tail">{label}</AppText>
      <AppText
        variant="cardMetric"
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
        style={{ fontSize: 22, lineHeight: 24, color: valueColor }}>
        {value}
      </AppText>
      {caption ? <AppText variant="meta" numberOfLines={2} ellipsizeMode="tail" style={{ color: palette.textTertiary, fontSize: 11 }}>{caption}</AppText> : null}
    </GlassCard>
  );
}
