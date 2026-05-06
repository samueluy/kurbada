import { LinearGradient } from 'expo-linear-gradient';
import { View, type ViewProps } from 'react-native';

import { palette, radius, shadows } from '@/constants/theme';

export function AppCard({
  style,
  children,
  ...rest
}: ViewProps) {
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: palette.surface,
          borderRadius: radius.lg,
          borderWidth: 0.5,
          borderColor: palette.border,
          padding: 20,
          overflow: 'hidden',
          ...shadows.card,
        },
        style,
      ]}>
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.02)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', inset: 0 }}
      />
      <View style={{ position: 'absolute', top: 0, left: 16, right: 16, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
      {children}
    </View>
  );
}
