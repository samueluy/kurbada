import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { AppScreen, AppScrollScreen } from '@/components/ui/app-screen';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { palette } from '@/constants/theme';
import { OnboardingHeader } from '@/components/ui/onboarding-header';
import { BikeIdentityForm, BIKE_IDENTITY_EMPTY, resolveBikeIdentity, type BikeIdentityDraft } from '@/features/garage/components/bike-identity-form';
import { bikeBrands, getModelsForBrand } from '@/lib/bike-models';
import { getOnboardingRoute, ONBOARDING_TOTAL_STEPS } from '@/lib/onboarding-flow';
import { useAppStore } from '@/store/app-store';
import type { RideMode } from '@/types/domain';

export default function BikeSetupScreen() {
  const params = useLocalSearchParams<{ flow?: string }>();
  const setOnboardingStep = useAppStore((state) => state.setOnboardingStep);
  const setPreferredMode = useAppStore((state) => state.setPreferredMode);
  const setOnboardingData = useAppStore((state) => state.setOnboardingData);
  const onboardingData = useAppStore((state) => state.onboardingData);
  const isOnboarding = params.flow === 'onboarding';

  const initialBrand = onboardingData.bikeBrand && !bikeBrands.includes(onboardingData.bikeBrand) ? 'Other' : onboardingData.bikeBrand || '';
  const initialModels = initialBrand && initialBrand !== 'Other' ? getModelsForBrand(initialBrand) : [];
  const initialModelIsCustom = Boolean(onboardingData.bikeModel && initialModels.length && !initialModels.some((item) => item.name === onboardingData.bikeModel));

  const [draft, setDraft] = useState<BikeIdentityDraft>({
    ...BIKE_IDENTITY_EMPTY,
    brand: initialBrand,
    brandCustom: initialBrand === 'Other' ? onboardingData.bikeBrand : '',
    model: initialModelIsCustom ? 'Other' : onboardingData.bikeModel || '',
    modelCustom: initialModelIsCustom ? onboardingData.bikeModel : '',
    year: onboardingData.bikeYear || '',
    engineCc: onboardingData.bikeEngineCc || '',
    odometerKm: onboardingData.bikeOdometerKm || '',
    ridingStyle: (onboardingData.ridingStyle as RideMode) || 'weekend',
  });

  const handleChange = (partial: Partial<BikeIdentityDraft>) => {
    setDraft((prev) => {
      const next = { ...prev, ...partial };
      // Sync draft to onboardingData zustand store so useOnboardingSync can pick it up
      const resolved = resolveBikeIdentity(next);
      setOnboardingData({
        bikeBrand: resolved.finalBrand,
        bikeModel: resolved.finalModel,
        bikeYear: resolved.finalYear,
        bikeEngineCc: resolved.finalCc,
        bikeOdometerKm: resolved.finalOdometer,
        ridingStyle: next.ridingStyle,
      });
      return next;
    });
  };

  const { isValid, finalBrand, finalModel, finalYear, finalCc, finalOdometer } = resolveBikeIdentity(draft);

  const handleNext = () => {
    if (!isValid) {
      return;
    }

    setOnboardingData({
      bikeBrand: finalBrand,
      bikeModel: finalModel,
      bikeYear: finalYear,
      bikeEngineCc: finalCc,
      bikeOdometerKm: finalOdometer,
      ridingStyle: draft.ridingStyle,
    });
    setPreferredMode(draft.ridingStyle);

    if (isOnboarding) {
      setOnboardingStep(4);
      router.push(getOnboardingRoute(4) as any);
    } else {
      router.replace('/(app)/(tabs)/ride');
    }
  };

  const content = (
    <>
        {isOnboarding ? (
          <OnboardingHeader step={2} onBack={() => { setOnboardingStep(1); router.replace(getOnboardingRoute(1) as any); }} />
        ) : null}
      <View style={{ gap: 8 }}>
        <AppText variant="screenTitle" style={{ fontSize: 30 }}>What do you ride?</AppText>
        <AppText variant="meta" style={{ color: palette.textSecondary }}>
          Pick your brand and model so Kurbada can estimate your fuel economy.
        </AppText>
      </View>

      <BikeIdentityForm value={draft} onChange={handleChange} showRidingStyle />
    </>
  );

  if (isOnboarding) {
    return (
      <AppScreen style={{ padding: 0 }} showWordmark={false}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <GlassCard style={{ flex: 1, borderRadius: 0, padding: 22, gap: 18 }}>
            <ScrollView
              contentContainerStyle={{ gap: 18, paddingBottom: 24 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled">
              {content}
            </ScrollView>
            <Button title="Next →" onPress={handleNext} disabled={!isValid} />
          </GlassCard>
        </KeyboardAvoidingView>
      </AppScreen>
    );
  }

  return (
    <AppScrollScreen
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ flexGrow: 1 }}>
      <GlassCard style={{ gap: 18, padding: 22 }}>
        {content}
        <Button title="Next →" onPress={handleNext} disabled={!isValid} />
      </GlassCard>
    </AppScrollScreen>
  );
}
