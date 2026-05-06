import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { palette, radius } from '@/constants/theme';

export function HUDStatCard({
  label,
  value,
  unit,
}: {
  label: string;
  value: string | number;
  unit?: string;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: palette.surface,
        borderRadius: radius.sm,
        borderWidth: 0.5,
        borderColor: palette.border,
        paddingHorizontal: 12,
        paddingVertical: 12,
        gap: 6,
      }}>
      <AppText variant="label" style={{ color: palette.textSecondary }}>
        {label}
      </AppText>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
        <AppText variant="cardMetric" style={{ fontSize: 28 }}>
          {value}
        </AppText>
        {unit ? (
          <AppText variant="meta" style={{ color: palette.textSecondary }}>
            {unit}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}
