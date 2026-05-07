import { Text, View } from 'react-native';

import { AppCard } from '@/components/ui/app-card';
import { AppText } from '@/components/ui/app-text';
import { Colors, palette, Typography } from '@/constants/theme';

export function StatCard({
  label,
  value,
  unit,
  accent = false,
}: {
  label: string;
  value: string | number;
  unit?: string;
  accent?: boolean;
}) {
  const numericValue = typeof value === 'number' ? value : Number(value);
  const isEmpty = Number.isFinite(numericValue) ? numericValue <= 0 : false;

  return (
    <AppCard style={{ flex: 1, gap: 8, padding: 14, borderRadius: 14 }}>
      <AppText variant="label">
        {label}
      </AppText>
      <View style={{ gap: 3 }}>
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.55}
          numberOfLines={1}
          style={{
            ...Typography.monoMD,
            color: isEmpty ? Colors.t3 : accent ? palette.danger : palette.text,
          }}>
          {value}
        </Text>
        {unit ? (
          <AppText variant="meta" style={{ color: palette.textTertiary }}>
            {unit}
          </AppText>
        ) : null}
      </View>
    </AppCard>
  );
}
