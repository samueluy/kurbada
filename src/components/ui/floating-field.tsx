import { TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { palette, radius, typography } from '@/constants/theme';

export function FloatingField({
  label,
  value,
  containerStyle,
  ...rest
}: TextInputProps & {
  label: string;
  containerStyle?: ViewStyle;
}) {
  return (
    <View
      style={[
        {
          backgroundColor: palette.surfaceMuted,
          borderRadius: radius.md,
          paddingHorizontal: 14,
          paddingVertical: 12,
          gap: 4,
          borderWidth: 0.5,
          borderColor: palette.border,
        },
        containerStyle,
      ]}>
      <AppText variant="label" style={{ color: palette.textSecondary }}>
        {label}
      </AppText>
      <TextInput
        value={value}
        placeholderTextColor={palette.textTertiary}
        style={{
          minHeight: 26,
          color: palette.text,
          fontFamily: typography.bodyMedium,
          fontSize: 17,
          padding: 0,
        }}
        {...rest}
      />
    </View>
  );
}
