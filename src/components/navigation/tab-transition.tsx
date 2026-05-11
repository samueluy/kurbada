import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

type TabTransitionProps = {
  children: React.ReactNode;
};

/**
 * Wraps a tab screen and replays a fade + slight upward slide each time the
 * screen becomes focused. Works alongside the existing AppScrollScreen mount
 * animation — the focus-driven animation runs on every tab switch.
 */
export function TabTransition({ children }: TabTransitionProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(8);

  useFocusEffect(
    useCallback(() => {
      opacity.value = 0;
      translateY.value = 8;
      opacity.value = withTiming(1, { duration: 280, easing: Easing.out(Easing.quad) });
      translateY.value = withTiming(0, { duration: 280, easing: Easing.out(Easing.quad) });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={[{ flex: 1 }, animatedStyle]}>{children}</Animated.View>;
}
