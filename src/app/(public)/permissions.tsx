import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { Accelerometer } from 'expo-sensors';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { AppScreen } from '@/components/ui/app-screen';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { palette } from '@/constants/theme';
import { useAppStore } from '@/store/app-store';

const loadingTexts = [
  'Configuring Garage...',
  'Generating Emergency ID...',
  'Calibrating Sensors...',
  'Profile Ready.',
];

export default function PermissionsScreen() {
  const setOnboardingStep = useAppStore((state) => state.setOnboardingStep);
  const [permissionsDone, setPermissionsDone] = useState(false);
  const [loadIndex, setLoadIndex] = useState(0);

  const handleEnableTelemetry = async () => {
    await Location.requestForegroundPermissionsAsync();
    Accelerometer.setUpdateInterval(100);
    const sub = Accelerometer.addListener(() => undefined);
    setTimeout(() => sub.remove(), 1000);
    setPermissionsDone(true);
  };

  useEffect(() => {
    if (!permissionsDone) return;

    const interval = setInterval(() => {
      setLoadIndex((prev) => {
        const next = prev + 1;
        if (next >= loadingTexts.length) {
          clearInterval(interval);
          setTimeout(() => {
            setOnboardingStep(6);
            router.replace('/(public)/paywall');
          }, 500);
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissionsDone]);

  if (!permissionsDone) {
    return (
      <AppScreen style={{ justifyContent: 'center' }}>
        <GlassCard style={{ minHeight: '78%', justifyContent: 'space-between', paddingVertical: 40, paddingHorizontal: 24 }}>
          <View style={{ alignItems: 'center', gap: 32 }}>
            <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: 'rgba(217,255,63,0.08)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="hardware-chip-outline" size={52} color={palette.lime} />
            </View>
            <View style={{ alignItems: 'center', gap: 14 }}>
              <AppText variant="label" style={{ color: palette.textSecondary }}>
                Step 5 of 7
              </AppText>
              <AppText variant="screenTitle" style={{ textAlign: 'center', fontSize: 32, lineHeight: 38 }}>
                We need to connect{'\n'}to your sensors.
              </AppText>
              <AppText variant="meta" style={{ textAlign: 'center', color: palette.textSecondary, lineHeight: 22 }}>
                To track your max lean angle, route, and detect sudden stops, Kurbada requires GPS and Motion access.
              </AppText>
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
            <Button title="Enable Telemetry" onPress={handleEnableTelemetry} />
          </View>
        </GlassCard>
      </AppScreen>
    );
  }

  return (
    <AppScreen style={{ justifyContent: 'center' }}>
      <GlassCard style={{ minHeight: '70%', justifyContent: 'center', paddingVertical: 40, paddingHorizontal: 24 }}>
        <View style={{ alignItems: 'center', gap: 32 }}>
          <ActivityIndicator size="large" color={palette.text} />

          <AppText variant="screenTitle" style={{ textAlign: 'center', fontSize: 28 }}>
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
      </GlassCard>
    </AppScreen>
  );
}
