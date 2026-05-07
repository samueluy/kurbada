import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { palette } from '@/constants/theme';

export function EmptyState({
  icon,
  title,
  body,
  actionTitle,
  onAction,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  actionTitle?: string;
  onAction?: () => void;
}) {
  return (
    <View style={{ minHeight: 160, alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 24 }}>
      <Ionicons name={icon} size={32} color={palette.textTertiary} />
      <AppText variant="title" style={{ textAlign: 'center', fontSize: 18 }}>
        {title}
      </AppText>
      <AppText variant="meta" style={{ textAlign: 'center', color: palette.textTertiary, maxWidth: 280 }}>
        {body}
      </AppText>
      {actionTitle && onAction ? <Button title={actionTitle} onPress={onAction} style={{ alignSelf: 'stretch', marginTop: 10 }} /> : null}
    </View>
  );
}
