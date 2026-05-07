import { View, type ViewProps } from 'react-native';

import { CardStyle } from '@/constants/theme';

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
          padding: 20,
          ...CardStyle,
        },
        style,
      ]}>
      {children}
    </View>
  );
}
