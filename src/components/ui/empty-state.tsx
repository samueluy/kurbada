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
    <View style={{ alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 36 }}>
      <Ionicons name={icon} size={42} color={palette.textSecondary} />
      <AppText variant="sectionTitle" style={{ textAlign: 'center' }}>
        {title}
      </AppText>
      <AppText variant="meta" style={{ textAlign: 'center', color: palette.textSecondary }}>
        {body}
      </AppText>
      {actionTitle && onAction ? <Button title={actionTitle} onPress={onAction} style={{ alignSelf: 'stretch', marginTop: 10 }} /> : null}
    </View>
  );
}
