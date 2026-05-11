import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';

export function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
      <AppText
        variant="title"
        numberOfLines={1}
        ellipsizeMode="tail"
        style={{ fontSize: 18, flex: 1, minWidth: 0 }}>
        {title}
      </AppText>
      {action ? <View style={{ flexShrink: 0 }}>{action}</View> : null}
    </View>
  );
}
