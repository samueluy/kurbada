import { useEffect, useRef } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Platform, RefreshControl, ScrollView, View, type ScrollViewProps, type ViewProps } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { layout, palette, spacing } from '@/constants/theme';
import { AppText } from '@/components/ui/app-text';

function Wordmark() {
  return (
    <View style={{ paddingBottom: 14 }}>
      <AppText variant="brand">KURBADA</AppText>
    </View>
  );
}

function useMountFade() {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;
  const didAnimate = useRef(false);

  useEffect(() => {
    if (didAnimate.current) {
      opacity.setValue(1);
      translateY.setValue(0);
      return;
    }
    didAnimate.current = true;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 280, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 280, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, [opacity, translateY]);

  return { opacity, translateY };
}

export function AppScreen({ style, children, showWordmark = true, ...rest }: ViewProps & { showWordmark?: boolean }) {
  const { opacity, translateY } = useMountFade();
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 8 : 0}>
        <Animated.View style={{ flex: 1, opacity, transform: [{ translateY }] }}>
          <View {...rest} style={[{ flex: 1, paddingHorizontal: layout.screenPadding, paddingTop: spacing.md, backgroundColor: palette.background }, style]}>
            {showWordmark ? <Wordmark /> : null}
            {children}
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function AppScrollScreen({ contentContainerStyle, style, children, showWordmark = true, refreshing, onRefresh, ...rest }: ScrollViewProps & { showWordmark?: boolean; refreshing?: boolean; onRefresh?: () => void }) {
  const { opacity, translateY } = useMountFade();
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 8 : 0}>
        <ScrollView
          {...rest}
          showsVerticalScrollIndicator={false}
          bounces={Boolean(onRefresh)}
          overScrollMode="never"
          keyboardShouldPersistTaps="always"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          contentInsetAdjustmentBehavior="always"
          refreshControl={onRefresh ? <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={palette.text} colors={[palette.danger]} progressBackgroundColor={palette.surfaceStrong} /> : undefined}
          style={[{ flex: 1, backgroundColor: palette.background }, style]}
          contentContainerStyle={[{ paddingHorizontal: layout.screenPadding, paddingTop: spacing.md, paddingBottom: 120 + insets.bottom }, contentContainerStyle]}>
          <Animated.View style={{ opacity, transform: [{ translateY }], gap: spacing.section }}>
            {showWordmark ? <Wordmark /> : null}
            {children}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
