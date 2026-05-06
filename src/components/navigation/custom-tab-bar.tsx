import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { Fuel, Gauge, ShieldUser, Warehouse } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, layout, radius, shadows } from '@/constants/theme';

const iconMap = {
  ride: (focused: boolean) => <Gauge size={22} color={focused ? Colors.inverse : Colors.textMuted} strokeWidth={2.1} />,
  garage: (focused: boolean) => <Warehouse size={22} color={focused ? Colors.inverse : Colors.textMuted} strokeWidth={2.1} />,
  fuel: (focused: boolean) => <Fuel size={22} color={focused ? Colors.inverse : Colors.textMuted} strokeWidth={2.1} />,
  profile: (focused: boolean) => <ShieldUser size={22} color={focused ? Colors.inverse : Colors.textMuted} strokeWidth={2.1} />,
};

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        paddingBottom: Math.max(insets.bottom, 12),
      }}>
      <BlurView
        intensity={30}
        tint="dark"
        style={{
          width: '88%',
          minHeight: layout.tabBarHeight,
          borderRadius: radius.pill,
          overflow: 'hidden',
          backgroundColor: 'rgba(10,10,10,0.78)',
          borderWidth: 0.5,
          borderColor: Colors.borderSoft,
          paddingHorizontal: 12,
          paddingVertical: 10,
          flexDirection: 'row',
          ...shadows.cardHeavy,
        }}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const onPress = () => navigation.navigate(route.name);
          const icon = iconMap[route.name as keyof typeof iconMap];

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityLabel={descriptors[route.key].options.tabBarAccessibilityLabel}
              onPress={onPress}
              style={{ flex: 1, minHeight: 52, alignItems: 'center', justifyContent: 'center', gap: 7 }}>
              {icon?.(focused)}
              <View
                style={{
                  width: focused ? 20 : 4,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: focused ? 'rgba(217,255,63,0.85)' : 'transparent',
                  shadowColor: '#D9FF3F',
                  shadowOpacity: focused ? 0.4 : 0,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 0 },
                }}
              />
            </Pressable>
          );
        })}
      </BlurView>
    </View>
  );
}
