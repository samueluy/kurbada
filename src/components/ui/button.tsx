import { Pressable, type PressableProps } from 'react-native';

import { palette, radius } from '@/constants/theme';
import { AppText } from '@/components/ui/app-text';

export function Button({
  title,
  variant = 'primary',
  style,
  ...rest
}: PressableProps & { title: string; variant?: 'primary' | 'secondary' | 'ghost' }) {
  const backgroundColor =
    variant === 'primary' ? palette.text : variant === 'secondary' ? palette.surfaceMuted : 'transparent';
  const borderWidth = variant === 'secondary' ? 0.5 : 0;

  return (
    <Pressable
      {...rest}
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
          transform: [{ scale: state.pressed ? 0.97 : 1 }],
          paddingHorizontal: 18,
        },
        typeof style === 'function' ? style(state) : style,
      ]}>
      <AppText variant="button" style={{ color: variant === 'primary' ? palette.background : variant === 'ghost' ? palette.textSecondary : palette.text }}>
        {title}
      </AppText>
    </Pressable>
  );
}
