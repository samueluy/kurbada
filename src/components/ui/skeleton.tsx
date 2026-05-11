import { useEffect } from 'react';
import { View, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { palette, radius } from '@/constants/theme';

export function Skeleton({
  height = 16,
  width = '100%',
  style,
}: {
  height?: number;
  width?: number | string;
  style?: ViewStyle;
}) {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withTiming(0.9, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [opacity]);

  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <View
      style={[
        { width: width as number, height, borderRadius: radius.sm, overflow: 'hidden' },
        style,
      ]}>
      <Animated.View style={[{ flex: 1, backgroundColor: palette.surfaceStrong }, animated]} />
    </View>
  );
}

export function SkeletonCard({ height = 96 }: { height?: number }) {
  return (
    <View
      style={{
        padding: 16,
        borderRadius: radius.lg,
        backgroundColor: 'rgba(255,255,255,0.03)',
        gap: 10,
      }}>
      <Skeleton height={14} width="40%" />
      <Skeleton height={height - 40} />
    </View>
  );
}

export function SkeletonList({ count = 3, height = 96 }: { count?: number; height?: number }) {
  return (
    <View style={{ gap: 10 }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} height={height} />
      ))}
    </View>
  );
}
