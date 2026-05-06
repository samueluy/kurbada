import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { palette, radius } from '@/constants/theme';

export function ListRow({
  title,
  subtitle,
  icon,
  value,
  onPress,
}: {
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  value?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        minHeight: 72,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingVertical: 12,
        borderBottomWidth: 0.5,
        borderBottomColor: palette.divider,
      }}>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: radius.sm,
          backgroundColor: palette.surfaceMuted,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Ionicons name={icon} size={18} color={palette.textSecondary} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="bodyBold">{title}</AppText>
        {subtitle ? <AppText variant="meta">{subtitle}</AppText> : null}
      </View>
      {value ? <AppText variant="meta" style={{ color: palette.text }}>{value}</AppText> : null}
      <Ionicons name="chevron-forward" size={16} color={palette.textTertiary} />
    </Pressable>
  );
}
