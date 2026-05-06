import { Animated, View } from 'react-native';
import { useEffect, useRef } from 'react';

import { palette, radius } from '@/constants/theme';

export function ProgressDots({
  total,
  current,
}: {
  total: number;
  current: number;
}) {
  const widths = useRef(Array.from({ length: total }, (_, index) => new Animated.Value(index === current ? 26 : index < current ? 18 : 8))).current;

  useEffect(() => {
    widths.forEach((width, index) => {
      Animated.spring(width, {
        toValue: index === current ? 26 : index < current ? 18 : 8,
        useNativeDriver: false,
        tension: 280,
        friction: 28,
      }).start();
    });
  }, [current, widths]);

  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {widths.map((width, index) => (
        <Animated.View
          key={index}
          style={{
            width,
            height: 8,
            borderRadius: radius.pill,
            backgroundColor: index === current ? palette.text : 'rgba(255,255,255,0.08)',
          }}
        />
      ))}
    </View>
  );
}
