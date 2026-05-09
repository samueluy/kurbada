import { useEffect, useRef } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Platform, ScrollView, View, type ScrollViewProps, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
      <Animated.View style={{ flex: 1, opacity, transform: [{ translateY }] }}>
        <View
          {...rest}
          style={[
            { flex: 1, paddingHorizontal: layout.screenPadding, paddingTop: spacing.md, backgroundColor: palette.background },
            style,
          ]}>
          {showWordmark ? <Wordmark /> : null}
          {children}
        </View>
      </Animated.View>
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
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <ScrollView
          {...rest}
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
          keyboardShouldPersistTaps="always"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          contentInsetAdjustmentBehavior="always"
          style={[{ flex: 1, backgroundColor: palette.background }, style]}
          contentContainerStyle={[
            {
              paddingHorizontal: layout.screenPadding,
              paddingTop: spacing.md,
              paddingBottom: 160,
            },
            contentContainerStyle,
          ]}>
          <Animated.View style={{ opacity, transform: [{ translateY }], gap: spacing.section }}>
            {showWordmark ? <Wordmark /> : null}
            {children}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
