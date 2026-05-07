import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { palette } from '@/constants/theme';

export function LeanAngleGauge({
  leanAngle,
  speed,
  calibrating = false,
}: {
  leanAngle: number;
  speed?: number;
  calibrating?: boolean;
}) {
  const value = calibrating ? 0 : Math.round(leanAngle);
  const isMuted = value === 0;

  return (
    <View style={{ width: '100%', alignItems: 'center', justifyContent: 'center', minHeight: 200, gap: 10 }}>
      <AppText variant="label" style={{ color: palette.textTertiary, fontSize: 10, letterSpacing: 3 }}>
        LEAN
      </AppText>
      <AppText
        variant="heroMetric"
        adjustsFontSizeToFit
        numberOfLines={1}
        style={{
          color: isMuted ? palette.textTertiary : palette.text,
          fontSize: 96,
          lineHeight: 104,
          maxWidth: '100%',
        }}>
        {value}°
      </AppText>
      <AppText variant="meta" style={{ color: palette.textSecondary }}>
        {speed !== undefined ? `${Math.round(speed)} km/h live` : 'lean telemetry live'}
      </AppText>
    </View>
  );
}
