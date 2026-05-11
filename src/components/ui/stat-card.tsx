import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { palette } from '@/constants/theme';

export function StatCard({ label, value, unit, accent = false }: { label: string; value: string | number; unit?: string; accent?: boolean }) {
  const numericValue = typeof value === 'number' ? value : Number(value);
  const isEmpty = Number.isFinite(numericValue) ? numericValue <= 0 : false;

  return (
    <View style={{ flex: 1, gap: 8, padding: 14, borderRadius: 14, backgroundColor: palette.surface, borderWidth: 0.5, borderColor: palette.border }}>
      <AppText variant="label">{label}</AppText>
      <View style={{ gap: 3 }}>
        <AppText
          variant="mono"
          style={{ fontSize: 22, lineHeight: 24, color: isEmpty ? palette.textTertiary : accent ? palette.danger : palette.text }}>
          {String(value)}
        </AppText>
        {unit ? <AppText variant="meta" style={{ color: palette.textTertiary }}>{unit}</AppText> : null}
      </View>
    </View>
  );
}
