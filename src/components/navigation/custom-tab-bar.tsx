import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { Colors, layout, radius } from '@/constants/theme';

const iconMap = {
  ride: (focused: boolean) => <Ionicons name="speedometer-outline" size={22} color={focused ? Colors.t1 : Colors.t3} />,
  garage: (focused: boolean) => (
    <MaterialCommunityIcons name="garage-variant" size={22} color={focused ? Colors.t1 : Colors.t3} />
  ),
  board: (focused: boolean) => <Ionicons name="radio-outline" size={22} color={focused ? Colors.t1 : Colors.t3} />,
  fuel: (focused: boolean) => <Ionicons name="car-outline" size={22} color={focused ? Colors.t1 : Colors.t3} />,
  profile: (focused: boolean) => <Ionicons name="shield-outline" size={22} color={focused ? Colors.t1 : Colors.t3} />,
};

const labelMap = {
  ride: 'Ride',
  garage: 'Garage',
  board: 'Lobby',
  fuel: 'Fuel',
  profile: 'Profile',
} as const;

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        backgroundColor: Colors.s1,
        borderTopWidth: 0.5,
        borderTopColor: Colors.border,
        paddingHorizontal: 10,
        paddingTop: 8,
        paddingBottom: Math.max(insets.bottom, 8),
        minHeight: layout.tabBarHeight + insets.bottom,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const icon = iconMap[route.name as keyof typeof iconMap];
        const label = labelMap[route.name as keyof typeof labelMap];

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityLabel={descriptors[route.key].options.tabBarAccessibilityLabel}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
              navigation.navigate(route.name);
            }}
            style={{
              flex: 1,
              minHeight: 44,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            {focused ? (
              <View
                style={{
                  backgroundColor: Colors.s3,
                  borderRadius: radius.pill,
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                  flexDirection: 'row',
                }}>
                {icon?.(true)}
                <AppText variant="button" style={{ color: Colors.t1, fontSize: 11 }}>
                  {label}
                </AppText>
                <View
                  style={{
                    position: 'absolute',
                    bottom: 4,
                    width: 12,
                    height: 2,
                    borderRadius: 2,
                    backgroundColor: Colors.red,
                  }}
                />
              </View>
            ) : (
              icon?.(false)
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
