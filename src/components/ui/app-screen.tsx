import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView, View, type ScrollViewProps, type ViewProps } from 'react-native';

import { layout, palette, spacing } from '@/constants/theme';
import { AppText } from '@/components/ui/app-text';

function Wordmark() {
  return (
    <View style={{ paddingBottom: 14 }}>
      <AppText variant="brand">KURBADA</AppText>
    </View>
  );
}

export function AppScreen({
  style,
  children,
  showWordmark = true,
  ...rest
}: ViewProps & { showWordmark?: boolean }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
      <View
        {...rest}
        style={[
          { flex: 1, paddingHorizontal: layout.screenPadding, paddingTop: spacing.md, backgroundColor: palette.background },
          style,
        ]}>
        {showWordmark ? <Wordmark /> : null}
        {children}
      </View>
    </SafeAreaView>
  );
}

export function AppScrollScreen({
  contentContainerStyle,
  style,
  children,
  showWordmark = true,
  ...rest
}: ScrollViewProps & { showWordmark?: boolean }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
      <ScrollView
        {...rest}
        style={[{ flex: 1, backgroundColor: palette.background }, style]}
        contentContainerStyle={[
          {
            paddingHorizontal: layout.screenPadding,
            paddingTop: spacing.md,
            paddingBottom: 108,
            gap: spacing.section,
          },
          contentContainerStyle,
        ]}>
        {showWordmark ? <Wordmark /> : null}
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
