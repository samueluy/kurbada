import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Keyboard, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { palette } from '@/constants/theme';

export function KeyboardSheet({
  visible,
  title,
  subtitle,
  onClose,
  children,
}: {
  visible: boolean;
  title?: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(420)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const screenHeight = Dimensions.get('window').height;
  const keyboardInset = Math.max(0, keyboardHeight - insets.bottom);
  const maxSheetHeight = Math.max(320, screenHeight - insets.top - 24);
  const androidSheetHeight = Math.min(maxSheetHeight, Math.max(360, Math.round(screenHeight * 0.62)));

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          tension: 280,
          friction: 30,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    translateY.setValue(420);
    opacity.setValue(0);
  }, [opacity, translateY, visible]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.62)', opacity }}>
        <Pressable style={{ flex: 1, justifyContent: 'flex-end' }} onPress={onClose}>
          <Pressable onPress={() => undefined}>
            <Animated.View
              style={{
                transform: [{ translateY }],
                maxHeight: maxSheetHeight,
                ...(Platform.OS === 'android' ? { height: androidSheetHeight } : {}),
                backgroundColor: palette.surfaceMuted,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                borderWidth: 0.5,
                borderColor: palette.border,
                overflow: 'hidden',
              }}>
              <ScrollView
                style={{ flex: 1 }}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
                automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
                keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                bounces={false}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                  flexGrow: 1,
                  paddingHorizontal: 20,
                  paddingTop: 16,
                  paddingBottom: insets.bottom + 20 + Math.min(keyboardInset + 12, 220),
                  gap: 14,
                }}>
                <View style={{ alignItems: 'center', gap: 12 }}>
                  <View
                    style={{
                      width: 40,
                      height: 4,
                      borderRadius: 999,
                      backgroundColor: palette.surfaceStrong,
                    }}
                  />
                  {title ? (
                    <AppText variant="sectionTitle" style={{ fontSize: 20, textAlign: 'center' }}>
                      {title}
                    </AppText>
                  ) : null}
                  {subtitle ? (
                    <AppText variant="meta" style={{ color: palette.textSecondary, textAlign: 'center' }}>
                      {subtitle}
                    </AppText>
                  ) : null}
                </View>
                {children}
              </ScrollView>
            </Animated.View>
          </Pressable>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}
