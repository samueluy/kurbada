import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';

export function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <AppText variant="sectionTitle">{title}</AppText>
      {action}
    </View>
  );
}
