import { Text, View } from 'react-native';

import { AppCard } from '@/components/ui/app-card';
import { AppText } from '@/components/ui/app-text';
import { palette, typography } from '@/constants/theme';

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
  return (
    <AppCard style={{ flex: 1, gap: 8 }}>
      <AppText variant="label" style={{ color: palette.textSecondary }}>
        {label}
      </AppText>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.55}
          numberOfLines={1}
          style={{
            flex: 1,
            fontFamily: typography.mono,
            fontSize: 34,
            color: accent ? palette.danger : palette.text,
          }}>
          {value}
        </Text>
        {unit ? (
          <AppText variant="meta" style={{ color: palette.textSecondary }}>
            {unit}
          </AppText>
        ) : null}
      </View>
    </AppCard>
  );
}
