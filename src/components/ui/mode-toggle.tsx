import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { useEffect } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { AppText } from '@/components/ui/app-text';
import { palette, radius } from '@/constants/theme';
import type { RideMode } from '@/types/domain';

export function ModeToggle({ value, onChange }: { value: RideMode; onChange: (mode: RideMode) => void }) {
  const { width } = useWindowDimensions();
  const containerWidth = Math.max(width - 48, 0);
  const pillWidth = Math.max((containerWidth - 8) / 2, 0);
  const translateX = useSharedValue(value === 'weekend' ? 0 : pillWidth);

  useEffect(() => {
    translateX.value = withSpring(value === 'weekend' ? 0 : pillWidth, {
      stiffness: 300,
      damping: 30,
      mass: 0.9,
    });
  }, [pillWidth, translateX, value]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: palette.surfaceMuted,
        borderRadius: radius.pill,
        padding: 4,
        position: 'relative',
        borderWidth: 0.5,
        borderColor: palette.border,
      }}>
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            top: 4,
            left: 4,
            width: pillWidth,
            bottom: 4,
            borderRadius: radius.pill,
            backgroundColor: palette.surfaceStrong,
          },
          thumbStyle,
        ]}
      />
      {([
        { mode: 'weekend', label: 'Weekend', icon: 'motorbike' },
        { mode: 'hustle', label: 'Daily', icon: 'flash-outline' },
      ] as const).map((item) => {
        const active = value === item.mode;
        return (
          <Pressable
            key={item.mode}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
              onChange(item.mode);
            }}
            style={{
              flex: 1,
              borderRadius: radius.pill,
              paddingVertical: 12,
              paddingHorizontal: 12,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MaterialCommunityIcons
                name={item.icon}
                size={16}
                color={active ? palette.text : palette.textTertiary}
              />
              <AppText
                variant={active ? 'bodyBold' : 'body'}
                style={{
                  fontSize: 14,
                  color: active ? palette.text : palette.textTertiary,
                  lineHeight: 18,
                }}>
                {item.label}
              </AppText>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
