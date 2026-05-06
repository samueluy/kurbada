import * as Haptics from 'expo-haptics';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { useEffect } from 'react';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { AppText } from '@/components/ui/app-text';
import { motion, palette, radius, shadows } from '@/constants/theme';
import type { RideMode } from '@/types/domain';

export function ModeToggle({ value, onChange }: { value: RideMode; onChange: (mode: RideMode) => void }) {
  const { width } = useWindowDimensions();
  const containerWidth = Math.max(width - 40, 0);
  const pillWidth = Math.max((containerWidth - 7) / 2, 0);
  const translateX = useSharedValue(value === 'weekend' ? 0 : pillWidth);

  useEffect(() => {
    translateX.value = withTiming(value === 'weekend' ? 0 : pillWidth, {
      duration: motion.base,
      easing: Easing.out(Easing.cubic),
    });
  }, [pillWidth, translateX, value]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderRadius: radius.pill,
        padding: 3,
        position: 'relative',
        borderWidth: 0.5,
        borderColor: palette.border,
      }}>
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            top: 3,
            left: 3,
            width: pillWidth,
            bottom: 3,
            borderRadius: radius.pill,
            backgroundColor: 'rgba(255,255,255,0.10)',
            borderWidth: 0.5,
            borderColor: 'rgba(255,255,255,0.14)',
            ...shadows.card,
          },
          thumbStyle,
        ]}
      />
      {(['weekend', 'hustle'] as const).map((mode) => {
        const active = value === mode;
        return (
          <Pressable
            key={mode}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
              onChange(mode);
            }}
            style={{
              flex: 1,
              borderRadius: radius.pill,
              paddingVertical: 14,
              alignItems: 'center',
            }}>
            <AppText variant="button" style={{ color: active ? palette.text : palette.textSecondary }}>
              {mode === 'weekend' ? 'Weekend' : 'Hustle'}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
