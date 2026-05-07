import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { AppScrollScreen } from '@/components/ui/app-screen';
import { Button } from '@/components/ui/button';
import { FloatingField } from '@/components/ui/floating-field';
import { GlassCard } from '@/components/ui/glass-card';
import { ProgressDots } from '@/components/ui/progress-dots';
import { palette, radius } from '@/constants/theme';
import {
  bikeCategoryOptions,
  getDefaultMaintenancePresets,
  rideStyleOptions,
} from '@/lib/onboarding';
import { useAppStore } from '@/store/app-store';

export default function BikeSetupScreen() {
  const params = useLocalSearchParams<{ flow?: string }>();
  const setOnboardingStep = useAppStore((state) => state.setOnboardingStep);
  const setPreferredMode = useAppStore((state) => state.setPreferredMode);
  const setOnboardingData = useAppStore((state) => state.setOnboardingData);
  const onboardingData = useAppStore((state) => state.onboardingData);
  const completeBikeSetup = useAppStore((state) => state.completeBikeSetup);
  const isOnboarding = params.flow === 'onboarding';

  const handleNext = () => {
    completeBikeSetup();
    setPreferredMode(onboardingData.ridingStyle);

    if (isOnboarding) {
      setOnboardingStep(3);
      router.replace('/(public)/maintenance');
      return;
    }

    router.replace('/(app)/(tabs)/ride');
  };

  const isComplete = Boolean(
    onboardingData.bikeBrand.trim()
      && onboardingData.bikeModel.trim()
      && onboardingData.bikeYear.trim()
      && onboardingData.bikeEngineCc.trim()
      && onboardingData.bikeOdometerKm.trim(),
  );

  return (
    <AppScrollScreen contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
      <GlassCard style={{ gap: 18, padding: 22 }}>
        {isOnboarding ? (
          <>
            <ProgressDots total={8} current={2} />
            <AppText variant="label" style={{ color: palette.textSecondary }}>
              Step 2 of 8
            </AppText>
          </>
        ) : null}

        <View style={{ gap: 8 }}>
          <AppText variant="screenTitle" style={{ fontSize: 30 }}>
            What do you ride?
          </AppText>
          <AppText variant="meta" style={{ color: palette.textSecondary }}>
            {isOnboarding
              ? 'Set up your machine now so Kurbada can save your Garage and telemetry profile the moment your account goes live.'
              : 'Add your bike now and we’ll sync it straight into your Garage.'}
          </AppText>
        </View>

        <FloatingField
          label="Bike Brand"
          value={onboardingData.bikeBrand}
          onChangeText={(value) => setOnboardingData({ bikeBrand: value })}
          placeholder="Kawasaki"
        />
        <FloatingField
          label="Model"
          value={onboardingData.bikeModel}
          onChangeText={(value) => setOnboardingData({ bikeModel: value })}
          placeholder="Ninja 400"
        />

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <FloatingField
              label="Year"
              value={onboardingData.bikeYear}
              onChangeText={(value) => setOnboardingData({ bikeYear: value.replace(/[^0-9]/g, '') })}
              placeholder="2024"
              keyboardType="number-pad"
            />
          </View>
          <View style={{ flex: 1 }}>
            <FloatingField
              label="Engine CC"
              value={onboardingData.bikeEngineCc}
              onChangeText={(value) => setOnboardingData({ bikeEngineCc: value.replace(/[^0-9]/g, '') })}
              placeholder="399"
              keyboardType="number-pad"
            />
          </View>
        </View>

        <FloatingField
          label="Current Odometer (km)"
          value={onboardingData.bikeOdometerKm}
          onChangeText={(value) => setOnboardingData({ bikeOdometerKm: value.replace(/[^0-9]/g, '') })}
          placeholder="12450"
          keyboardType="number-pad"
        />

        <View style={{ gap: 8 }}>
          <AppText variant="label" style={{ color: palette.textSecondary, fontSize: 12 }}>
            Category
          </AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {bikeCategoryOptions.map((option) => {
              const active = onboardingData.bikeCategory === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() =>
                    setOnboardingData({
                      bikeCategory: option.value,
                      maintenancePresetKeys: getDefaultMaintenancePresets(option.value),
                    })
                  }
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: radius.pill,
                    borderWidth: 0.5,
                    borderColor: active ? palette.text : palette.border,
                    backgroundColor: active ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
                  }}>
                  <MaterialCommunityIcons
                  name={option.icon}
                    size={18}
                    color={active ? palette.text : palette.textSecondary}
                  />
                  <AppText variant="button" style={{ color: active ? palette.text : palette.textSecondary, fontSize: 13 }}>
                    {option.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <AppText variant="label" style={{ color: palette.textSecondary, fontSize: 12 }}>
            Riding Style
          </AppText>
          {rideStyleOptions.map((style) => {
            const active = onboardingData.ridingStyle === style.mode;
            return (
              <Pressable
                key={style.mode}
                onPress={() => {
                  setOnboardingData({ ridingStyle: style.mode });
                  setPreferredMode(style.mode);
                }}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  borderRadius: radius.md,
                  borderWidth: 0.5,
                  borderColor: active ? palette.text : palette.border,
                  backgroundColor: active ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
                  paddingHorizontal: 16,
                  paddingVertical: 14,
                }}>
                <MaterialCommunityIcons
                  name={style.icon}
                  size={22}
                  color={active ? palette.text : palette.textSecondary}
                />
                <View style={{ flex: 1, gap: 2 }}>
                  <AppText variant="bodyBold" style={{ color: active ? palette.text : palette.textSecondary }}>
                    {style.label}
                  </AppText>
                  <AppText variant="meta" style={{ fontSize: 12, color: palette.textTertiary }}>
                    {style.subtitle}
                  </AppText>
                </View>
              </Pressable>
            );
          })}
        </View>

        <Button title={isOnboarding ? 'Next →' : 'Save Bike →'} onPress={handleNext} disabled={!isComplete} />
      </GlassCard>
    </AppScrollScreen>
  );
}
