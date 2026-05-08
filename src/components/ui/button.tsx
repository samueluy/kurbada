import { useRef } from 'react';
import { Animated, Pressable, type PressableProps } from 'react-native';

import { palette, radius } from '@/constants/theme';
import { AppText } from '@/components/ui/app-text';

export function Button({
  title,
  variant = 'primary',
  style,
  ...rest
}: PressableProps & { title: string; variant?: 'primary' | 'secondary' | 'ghost' }) {
  const backgroundColor =
    variant === 'primary' ? '#C0392B' : variant === 'secondary' ? palette.surfaceMuted : 'transparent';
  const borderWidth = variant === 'ghost' ? 0 : 0.5;
  const scale = useRef(new Animated.Value(1)).current;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        {...rest}
        onPressIn={(event) => {
          Animated.timing(scale, {
            toValue: 0.96,
            duration: 80,
            useNativeDriver: true,
          }).start();
          rest.onPressIn?.(event);
        }}
        onPressOut={(event) => {
          Animated.spring(scale, {
            toValue: 1,
            tension: 400,
            friction: 20,
            useNativeDriver: true,
          }).start();
          rest.onPressOut?.(event);
        }}
        style={(state) => [
          {
            minHeight: 52,
            borderRadius: radius.md,
            backgroundColor,
            alignItems: 'center',
            justifyContent: 'center',
            borderColor: palette.border,
            borderWidth,
            opacity: rest.disabled ? 0.5 : 1,
            paddingHorizontal: 18,
          },
          typeof style === 'function' ? style(state) : style,
        ]}>
        <AppText
          variant="button"
          style={{
            color: variant === 'primary' ? '#FFFFFF' : variant === 'ghost' ? palette.textSecondary : palette.text,
          }}>
          {title}
        </AppText>
      </Pressable>
    </Animated.View>
  );
}
