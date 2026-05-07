import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { radius } from '@/constants/theme';

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
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderRadius: radius.sm,
        borderWidth: 0.5,
        borderColor: 'rgba(255,255,255,0.08)',
        paddingHorizontal: 10,
        paddingVertical: 10,
        gap: 4,
      }}>
      <AppText variant="label" style={{ color: 'rgba(255,255,255,0.3)', fontSize: 8, letterSpacing: 1.2 }}>
        {label}
      </AppText>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
        <AppText variant="cardMetric" style={{ fontSize: 24, lineHeight: 26 }}>
          {value}
        </AppText>
        {unit ? (
          <AppText variant="meta" style={{ color: 'rgba(255,255,255,0.25)', fontSize: 9 }}>
            {unit}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}
