import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { Colors, layout, radius } from '@/constants/theme';

const iconMap = {
  ride: (focused: boolean) => <Ionicons name="speedometer" size={22} color={focused ? Colors.t1 : Colors.t3} />,
  garage: (focused: boolean) => (
    <MaterialCommunityIcons name="garage-variant" size={22} color={focused ? Colors.t1 : Colors.t3} />
  ),
  board: (focused: boolean) => <Ionicons name="radio-outline" size={22} color={focused ? Colors.t1 : Colors.t3} />,
  fuel: (focused: boolean) => <MaterialCommunityIcons name="gas-station-outline" size={22} color={focused ? Colors.t1 : Colors.t3} />,
  profile: (focused: boolean) => <Ionicons name="person-outline" size={22} color={focused ? Colors.t1 : Colors.t3} />,
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
  const [tabLayouts, setTabLayouts] = useState<Record<string, { x: number; width: number }>>({});
  const activeKey = state.routes[state.index]?.key;
  const activeLayout = activeKey ? tabLayouts[activeKey] : undefined;
  const pillX = useSharedValue(activeLayout?.x ?? 0);
  const pillWidth = useSharedValue(activeLayout?.width ?? 0);

  useEffect(() => {
    if (!activeLayout) {
      return;
    }

    pillX.value = withSpring(activeLayout.x, {
      stiffness: 280,
      damping: 28,
      mass: 1,
    });
    pillWidth.value = withSpring(activeLayout.width, {
      stiffness: 280,
      damping: 28,
      mass: 1,
    });
  }, [activeLayout, pillWidth, pillX]);

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pillX.value }],
    width: pillWidth.value,
    opacity: pillWidth.value > 0 ? 1 : 0,
  }));

  const tabSlots = useMemo(
    () =>
      state.routes.map((route, index) => ({
        route,
        index,
        focused: state.index === index,
        icon: iconMap[route.name as keyof typeof iconMap],
        label: labelMap[route.name as keyof typeof labelMap],
      })),
    [state.index, state.routes],
  );

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
        position: 'relative',
      }}>
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            top: 8,
            bottom: Math.max(insets.bottom, 8),
            backgroundColor: Colors.s3,
            borderRadius: radius.pill,
          },
          pillStyle,
        ]}
      />
      {tabSlots.map(({ route, focused, icon, label }) => {

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityLabel={descriptors[route.key].options.tabBarAccessibilityLabel}
            onLayout={(event) => {
              const { x, width } = event.nativeEvent.layout;
              setTabLayouts((current) => {
                const existing = current[route.key];
                if (existing?.x === x && existing?.width === width) {
                  return current;
                }
                return { ...current, [route.key]: { x, width } };
              });
            }}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
              navigation.navigate(route.name);
            }}
            style={{
              flex: 1,
              minHeight: 44,
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1,
            }}>
            {focused ? (
              <View
                style={{
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
