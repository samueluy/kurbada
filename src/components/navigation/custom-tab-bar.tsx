import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { Colors, radius } from '@/constants/theme';

const iconMap = {
  ride: (focused: boolean) => <Ionicons name="speedometer" size={20} color={focused ? Colors.t1 : Colors.t3} />,
  garage: (focused: boolean) => (
    <MaterialCommunityIcons name="garage-variant" size={20} color={focused ? Colors.t1 : Colors.t3} />
  ),
  board: (focused: boolean) => <Ionicons name="radio-outline" size={20} color={focused ? Colors.t1 : Colors.t3} />,
  fuel: (focused: boolean) => <MaterialCommunityIcons name="gas-station-outline" size={20} color={focused ? Colors.t1 : Colors.t3} />,
  profile: (focused: boolean) => <Ionicons name="person-outline" size={20} color={focused ? Colors.t1 : Colors.t3} />,
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
    if (!activeLayout) return;
    pillX.value = withSpring(activeLayout.x, { stiffness: 280, damping: 28, mass: 1 });
    pillWidth.value = withSpring(activeLayout.width, { stiffness: 280, damping: 28, mass: 1 });
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
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        paddingBottom: Math.max(insets.bottom, 8),
        pointerEvents: 'box-none',
      }}>
      <View
        style={{
          width: '92%',
          backgroundColor: 'rgba(10,10,10,0.85)',
          borderRadius: radius.round,
          borderWidth: 0.5,
          borderColor: Colors.border,
          paddingHorizontal: 8,
          paddingVertical: 8,
          flexDirection: 'row',
          position: 'relative',
          overflow: 'hidden',
        }}>
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              top: 6,
              bottom: 6,
              backgroundColor: Colors.s3,
              borderRadius: 20,
            },
            pillStyle,
          ]}
        />
        {tabSlots.map(({ route, focused, icon, label }) => (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityLabel={descriptors[route.key].options.tabBarAccessibilityLabel}
            onLayout={(event) => {
              const { x, width } = event.nativeEvent.layout;
              setTabLayouts((current) => {
                const existing = current[route.key];
                if (existing?.x === x && existing?.width === width) return current;
                return { ...current, [route.key]: { x, width } };
              });
            }}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
              navigation.navigate(route.name);
            }}
            style={{
              flex: 1,
              minHeight: 48,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              flexDirection: 'column',
              zIndex: 1,
            }}>
            {icon?.(focused)}
            {focused ? (
              <AppText variant="button" style={{ color: Colors.t1, fontSize: 10, lineHeight: 12 }}>
                {label}
              </AppText>
            ) : null}
          </Pressable>
        ))}
      </View>
    </View>
  );
}
