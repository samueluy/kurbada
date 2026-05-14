import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { AppScreen, AppScrollScreen } from '@/components/ui/app-screen';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { palette } from '@/constants/theme';
import { OnboardingHeader } from '@/components/ui/onboarding-header';
import { BikeIdentityForm, BIKE_IDENTITY_EMPTY, resolveBikeIdentity, type BikeIdentityDraft } from '@/features/garage/components/bike-identity-form';
import { useAuth } from '@/hooks/use-auth';
import { useBikeMutations } from '@/hooks/use-kurbada-data';
import { useKeyboardInset } from '@/hooks/use-keyboard-inset';
import { bikeBrands, getModelsForBrand, inferBikeCategory } from '@/lib/bike-models';
import { getOnboardingRoute } from '@/lib/onboarding-flow';
import { triggerLightHaptic } from '@/lib/haptics';
import { useAppStore } from '@/store/app-store';
import type { RideMode } from '@/types/domain';

export default function BikeSetupScreen() {
  const params = useLocalSearchParams<{ flow?: string }>();
  const { session } = useAuth();
  const setOnboardingStep = useAppStore((state) => state.setOnboardingStep);
  const setPreferredMode = useAppStore((state) => state.setPreferredMode);
  const setOnboardingData = useAppStore((state) => state.setOnboardingData);
  const clearAnonymousOnboardingDraft = useAppStore((state) => state.clearAnonymousOnboardingDraft);
  const completeOnboarding = useAppStore((state) => state.completeOnboarding);
  const completeBikeSetup = useAppStore((state) => state.completeBikeSetup);
  const setActiveBikeId = useAppStore((state) => state.setActiveBikeId);
  const onboardingData = useAppStore((state) => state.onboardingData);
  const { saveBikeSetup } = useBikeMutations(session?.user.id);
  const isOnboarding = params.flow === 'onboarding';
  const keyboardInset = useKeyboardInset();
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    setDraft((prev) => ({ ...prev, ...partial }));
  };

  useEffect(() => {
    if (!isOnboarding) {
      return;
    }

    const resolved = resolveBikeIdentity(draft);
    setOnboardingData({
      bikeBrand: resolved.finalBrand,
      bikeModel: resolved.finalModel,
      bikeYear: resolved.finalYear,
      bikeEngineCc: resolved.finalCc,
      bikeOdometerKm: resolved.finalOdometer,
      bikeCategory: inferBikeCategory({ model: resolved.finalModel, cc: resolved.finalCc }),
      ridingStyle: draft.ridingStyle,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  const { isValid, finalBrand, finalModel, finalYear, finalCc, finalOdometer } = resolveBikeIdentity(draft);

  const handleNext = () => {
    if (!isValid) {
      return;
    }

    triggerLightHaptic();

    if (isOnboarding) {
      setOnboardingData({
        bikeBrand: finalBrand,
        bikeModel: finalModel,
        bikeYear: finalYear,
        bikeEngineCc: finalCc,
        bikeOdometerKm: finalOdometer,
        bikeCategory: inferBikeCategory({ model: finalModel, cc: finalCc }),
        ridingStyle: draft.ridingStyle,
      });
      setPreferredMode(draft.ridingStyle);
      setOnboardingStep(2);
      router.push(getOnboardingRoute(2) as any);
      return;
    }

    if (!session?.user.id) {
      router.replace('/(app)/(tabs)/ride');
      return;
    }

    setIsSubmitting(true);
    void saveBikeSetup.mutateAsync({
      make: finalBrand,
      model: finalModel,
      nickname: null,
      year: Number(finalYear),
      engine_cc: Number(finalCc),
      current_odometer_km: Number(finalOdometer),
      category: inferBikeCategory({ model: finalModel, cc: finalCc }),
    }).then((bike) => {
      completeBikeSetup();
      setActiveBikeId(bike.id);
      router.replace('/(app)/(tabs)/ride');
    }).catch((error) => {
      Alert.alert(
        'Could not save bike',
        error instanceof Error ? error.message : 'Please try again.',
      );
    }).finally(() => {
      setIsSubmitting(false);
    });
  };

  const content = (
    <>
        {isOnboarding ? (
          <OnboardingHeader step={1} />
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
              contentContainerStyle={{ gap: 18, paddingBottom: 24 + keyboardInset }}
              showsVerticalScrollIndicator={false}
              automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
              keyboardShouldPersistTaps="handled">
              {content}
            </ScrollView>
            <View style={{ gap: 10 }}>
              <Button
                title={isOnboarding ? 'Next →' : isSubmitting ? 'Saving...' : 'Save Bike'}
                onPress={handleNext}
                disabled={!isValid || isSubmitting}
              />
              <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                <AppText variant="meta" style={{ color: palette.textSecondary }}>
                  Already have an account?
                </AppText>
                <Pressable
                  hitSlop={8}
                  onPress={() => {
                    triggerLightHaptic();
                    clearAnonymousOnboardingDraft();
                    completeOnboarding();
                    router.replace('/(public)/auth/sign-in');
                  }}>
                  <AppText variant="meta" style={{ color: palette.text, textDecorationLine: 'underline' }}>
                    Sign in
                  </AppText>
                </Pressable>
              </View>
            </View>
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
        <Button
          title={isOnboarding ? 'Next →' : isSubmitting ? 'Saving...' : 'Save Bike'}
          onPress={handleNext}
          disabled={!isValid || isSubmitting}
        />
      </GlassCard>
    </AppScrollScreen>
  );
}
