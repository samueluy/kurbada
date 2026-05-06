import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, View, type ScrollViewProps, type ViewProps } from 'react-native';

import { layout, palette, spacing } from '@/constants/theme';

export function AppScreen({ style, ...rest }: ViewProps) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
      <View
        {...rest}
        style={[
          { flex: 1, paddingHorizontal: layout.screenPadding, paddingTop: spacing.md, backgroundColor: palette.background },
          style,
        ]}
      />
    </SafeAreaView>
  );
}

export function AppScrollScreen({ contentContainerStyle, style, ...rest }: ScrollViewProps) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
      <ScrollView
        {...rest}
        style={[{ flex: 1, backgroundColor: palette.background }, style]}
        contentContainerStyle={[
          {
            paddingHorizontal: layout.screenPadding,
            paddingTop: spacing.md,
            paddingBottom: 132,
            gap: spacing.section,
          },
          contentContainerStyle,
        ]}
      />
    </SafeAreaView>
  );
}
