import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Stack, router } from 'expo-router';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Accelerometer } from 'expo-sensors';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Pressable, ScrollView, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { AppScreen } from '@/components/ui/app-screen';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { palette } from '@/constants/theme';
import { triggerLightHaptic, triggerSuccessHaptic } from '@/lib/haptics';
import { getOnboardingRoute, ONBOARDING_TOTAL_STEPS } from '@/lib/onboarding-flow';
import { useAppStore } from '@/store/app-store';

const loadingTexts = [
  'Configuring Garage...',
  'Generating Emergency ID...',
  'Setting up tracking…',
  'Profile Ready.',
];

export default function PermissionsScreen() {
  const setOnboardingStep = useAppStore((state) => state.setOnboardingStep);
  const [permissionsDone, setPermissionsDone] = useState(false);
  const [loadIndex, setLoadIndex] = useState(0);
  const completionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didAdvanceRef = useRef(false);

  const handleEnableTelemetry = async () => {
    triggerLightHaptic();
    await Location.requestForegroundPermissionsAsync();
    await Notifications.requestPermissionsAsync();
    Accelerometer.setUpdateInterval(100);
    const sub = Accelerometer.addListener(() => undefined);
    setTimeout(() => sub.remove(), 1000);
    didAdvanceRef.current = false;
    setPermissionsDone(true);
  };

  useEffect(() => {
    if (!permissionsDone) return;

    const interval = setInterval(() => {
      setLoadIndex((prev) => {
        const next = prev + 1;
        if (next >= loadingTexts.length) {
          clearInterval(interval);
          completionTimeoutRef.current = setTimeout(() => {
            didAdvanceRef.current = true;
            triggerSuccessHaptic();
            setOnboardingStep(6);
            router.push(getOnboardingRoute(6) as any);
          }, 500);
        }
        return next;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
      if (completionTimeoutRef.current) {
        clearTimeout(completionTimeoutRef.current);
        completionTimeoutRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissionsDone]);

  useEffect(() => {
    if (!permissionsDone) {
      return;
    }

    const backSubscription = BackHandler.addEventListener('hardwareBackPress', () => true);

    return () => {
      backSubscription.remove();
    };
  }, [permissionsDone]);

  useFocusEffect(
    useCallback(() => {
      if (didAdvanceRef.current && permissionsDone) {
        didAdvanceRef.current = false;
        setPermissionsDone(false);
        setLoadIndex(0);
      }

      return () => {
        if (completionTimeoutRef.current) {
          clearTimeout(completionTimeoutRef.current);
          completionTimeoutRef.current = null;
        }
      };
    }, [permissionsDone]),
  );

  if (!permissionsDone) {
    return (
      <AppScreen style={{ justifyContent: 'center', paddingHorizontal: 0, paddingTop: 0 }} showWordmark={false}>
        <GlassCard style={{ flex: 1, borderRadius: 0, padding: 22, gap: 18 }}>
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between', gap: 18, paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
          >
            <View style={{ gap: 18 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Pressable
                onPress={() => {
                  triggerLightHaptic();
                  setOnboardingStep(4);
                  if (router.canGoBack()) {
                    router.back();
                    return;
                  }
                  router.replace(getOnboardingRoute(4) as any);
                }}>
                <Ionicons name="arrow-back" size={20} color={palette.textSecondary} />
              </Pressable>
                <AppText variant="label" style={{ color: palette.textSecondary }}>
                  Step 5 of {ONBOARDING_TOTAL_STEPS}
                </AppText>
              </View>

              <View style={{ alignItems: 'center', gap: 32, paddingTop: 16 }}>
                <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(217,255,63,0.08)', alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="hardware-chip-outline" size={52} color={palette.lime} />
                </View>
                <View style={{ alignItems: 'center', gap: 14 }}>
                  <AppText variant="screenTitle" style={{ textAlign: 'center', fontSize: 30, lineHeight: 36 }}>
                    We need access to{'\n'}your location and motion.
                  </AppText>
                  <AppText variant="meta" style={{ textAlign: 'center', color: palette.textSecondary, lineHeight: 22 }}>
                    To track your max lean angle, route, and detect sudden stops, Kurbada requires GPS and Motion access.
                  </AppText>
                </View>
              </View>
            </View>

            <View style={{ gap: 14 }}>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="location-outline" size={16} color={palette.textSecondary} />
                <AppText variant="meta" style={{ color: palette.textTertiary }}>GPS for route tracking</AppText>
              </View>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="phone-portrait-outline" size={16} color={palette.textSecondary} />
                <AppText variant="meta" style={{ color: palette.textTertiary }}>Motion sensors for lean angle</AppText>
              </View>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="notifications-outline" size={16} color={palette.textSecondary} />
                <AppText variant="meta" style={{ color: palette.textTertiary }}>Notifications for maintenance + crash alerts</AppText>
              </View>
              <Button title="Enable Tracking" onPress={handleEnableTelemetry} />
            </View>
          </ScrollView>
        </GlassCard>
      </AppScreen>
    );
  }

  return (
    <AppScreen style={{ flex: 1, paddingHorizontal: 0, paddingTop: 0 }} showWordmark={false}>
      <Stack.Screen options={{ gestureEnabled: false, fullScreenGestureEnabled: false }} />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, backgroundColor: palette.background }}>
        <View style={{ alignItems: 'center', gap: 32, width: '100%' }}>
          <ActivityIndicator size="large" color={palette.text} />

          <AppText variant="screenTitle" style={{ textAlign: 'center', fontSize: 30, lineHeight: 36 }}>
            {loadingTexts[loadIndex] || 'Profile Ready.'}
          </AppText>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            {loadingTexts.map((_, i) => (
              <View
                key={i}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: i <= loadIndex ? palette.text : 'rgba(255,255,255,0.1)',
                }}
              />
            ))}
          </View>
        </View>
      </View>
    </AppScreen>
  );
}
