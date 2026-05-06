import { Tabs } from 'expo-router';

import { CustomTabBar } from '@/components/navigation/custom-tab-bar';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <CustomTabBar {...props} />}>
      <Tabs.Screen name="ride" />
      <Tabs.Screen name="garage" />
      <Tabs.Screen name="fuel" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
