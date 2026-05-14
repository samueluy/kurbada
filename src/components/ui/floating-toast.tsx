import { useEffect, useRef } from 'react';
import { Animated, Modal, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { Colors, layout, palette, radius } from '@/constants/theme';

type FloatingToastProps = {
  message: string;
  anchor?: 'safe' | 'tabs';
};

export function FloatingToast({ message, anchor = 'safe' }: FloatingToastProps) {
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]),
      Animated.delay(2000),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 8, duration: 220, useNativeDriver: true }),
      ]),
    ]).start();
  }, [opacity, translateY]);

  const bottomOffset =
    anchor === 'tabs'
      ? layout.tabBarHeight + Math.max(insets.bottom, 10) + 8
      : insets.bottom + 16;

  return (
    <Modal transparent visible animationType="none" onRequestClose={() => undefined}>
      <Animated.View
        pointerEvents="none"
        style={{
          flex: 1,
          justifyContent: 'flex-end',
          paddingHorizontal: 20,
          paddingBottom: bottomOffset,
          opacity,
          transform: [{ translateY }],
        }}>
        <View
          style={{
            backgroundColor: Colors.s2,
            borderRadius: radius.md,
            borderLeftWidth: 3,
            borderLeftColor: Colors.green,
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderWidth: 0.5,
            borderColor: palette.border,
          }}>
          <AppText variant="bodyBold" style={{ fontSize: 13 }}>
            {message}
          </AppText>
        </View>
      </Animated.View>
    </Modal>
  );
}
