import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { AppScrollScreen } from '@/components/ui/app-screen';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { ProgressDots } from '@/components/ui/progress-dots';
import { palette, radius } from '@/constants/theme';
import {
  getDefaultMaintenancePresets,
  getVisibleMaintenancePresets,
  maintenancePresetCatalog,
} from '@/lib/onboarding';
import { useAppStore } from '@/store/app-store';
import type { MaintenancePresetKey } from '@/types/domain';

export default function OnboardingMaintenanceScreen() {
  const onboardingData = useAppStore((state) => state.onboardingData);
  const setOnboardingData = useAppStore((state) => state.setOnboardingData);
  const setOnboardingStep = useAppStore((state) => state.setOnboardingStep);
  const presets = getVisibleMaintenancePresets(onboardingData.bikeCategory);

  useEffect(() => {
    if (onboardingData.maintenancePresetKeys.length === 0) {
      setOnboardingData({
        maintenancePresetKeys: getDefaultMaintenancePresets(onboardingData.bikeCategory),
      });
    }
  }, [onboardingData.bikeCategory, onboardingData.maintenancePresetKeys.length, setOnboardingData]);

  const togglePreset = (key: MaintenancePresetKey) => {
    const active = onboardingData.maintenancePresetKeys.includes(key);
    const next = active
      ? onboardingData.maintenancePresetKeys.filter((item) => item !== key)
      : [...onboardingData.maintenancePresetKeys, key];

    setOnboardingData({ maintenancePresetKeys: next });
  };

  return (
    <AppScrollScreen contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
      <GlassCard style={{ gap: 18, padding: 22 }}>
        <ProgressDots total={8} current={3} />
        <AppText variant="label" style={{ color: palette.textSecondary }}>
          Step 3 of 8
        </AppText>

        <View style={{ gap: 8 }}>
          <AppText variant="screenTitle" style={{ fontSize: 30 }}>
            What should we track for your {onboardingData.bikeBrand || 'bike'}?
          </AppText>
          <AppText variant="meta" style={{ color: palette.textSecondary }}>
            Pick the service intervals you care about and we’ll seed your Garage with the right reminders.
          </AppText>
        </View>

        <View style={{ gap: 10 }}>
          {presets.map((key) => {
            const preset = maintenancePresetCatalog[key];
            const active = onboardingData.maintenancePresetKeys.includes(key);

            return (
              <Pressable
                key={key}
                onPress={() => togglePreset(key)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 14,
                  borderRadius: radius.md,
                  borderWidth: 0.5,
                  borderColor: active ? palette.text : palette.border,
                  backgroundColor: active ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                }}>
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    borderWidth: 1,
                    borderColor: active ? palette.text : palette.border,
                    backgroundColor: active ? palette.text : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  {active ? <Ionicons name="checkmark" size={14} color={palette.background} /> : null}
                </View>
                <AppText variant="bodyBold" style={{ flex: 1, color: active ? palette.text : palette.textSecondary }}>
                  {preset.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        <Button
          title="Next →"
          onPress={() => {
            setOnboardingStep(4);
            router.replace('/(public)/emergency?flow=onboarding');
          }}
        />
      </GlassCard>
    </AppScrollScreen>
  );
}
