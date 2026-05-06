import { LinearGradient } from 'expo-linear-gradient';
import { View, type ViewProps } from 'react-native';

import { palette, radius, shadows } from '@/constants/theme';

export function GlassCard({ children, style, ...rest }: ViewProps) {
  return (
    <View
      {...rest}
      style={[
        {
          borderRadius: radius.lg,
          overflow: 'hidden',
          backgroundColor: palette.surface,
          borderWidth: 0.5,
          borderColor: palette.border,
          ...shadows.card,
        },
        style,
      ]}>
      <LinearGradient
        colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.02)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', inset: 0 }}
      />
      <View style={{ position: 'absolute', top: 0, left: 16, right: 16, height: 1, backgroundColor: 'rgba(255,255,255,0.09)' }} />
      {children}
    </View>
  );
}
