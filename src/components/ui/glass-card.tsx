import { View, type ViewProps } from 'react-native';

import { CardStyle } from '@/constants/theme';

export function GlassCard({ children, style, ...rest }: ViewProps) {
  return (
    <View
      {...rest}
      style={[
        {
          ...CardStyle,
        },
        style,
      ]}>
      {children}
    </View>
  );
}
