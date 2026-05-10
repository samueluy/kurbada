import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { AppScreen, AppScrollScreen } from '@/components/ui/app-screen';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { PickerSheet, type PickerSheetRef } from '@/components/ui/picker-sheet';
import { palette, radius, typography } from '@/constants/theme';
import { useAppStore } from '@/store/app-store';
import { bikeBrands, getModelsForBrand } from '@/lib/bike-models';
import { getOnboardingRoute, ONBOARDING_TOTAL_STEPS } from '@/lib/onboarding-flow';
import type { RideMode } from '@/types/domain';

const ridingStyles: { mode: RideMode; label: string; subtitle: string; icon: string }[] = [
  { mode: 'weekend', label: 'Weekend Twisties', subtitle: 'Cinematic telemetry, curves, max lean', icon: 'speedometer-outline' },
  { mode: 'hustle', label: 'Daily Ride', subtitle: 'Traffic efficiency, fuel tracking, battery smart', icon: 'timer-outline' },
];

function PickerTrigger({ label, value, placeholder, onPress }: { label: string; value: string; placeholder: string; onPress: () => void }) {
  return (
    <View style={{ gap: 6 }}>
      <AppText variant="label" style={{ color: palette.textSecondary, fontSize: 12 }}>{label}</AppText>
      <Pressable
        onPress={onPress}
        style={{ paddingVertical: 14, paddingHorizontal: 16, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 0.5, borderColor: palette.border }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <AppText variant="body" style={{ color: value ? palette.text : palette.textTertiary }}>{value || placeholder}</AppText>
          <Ionicons name="chevron-down" size={20} color={palette.textSecondary} />
        </View>
      </Pressable>
    </View>
  );
}

const inputStyle = {
  minHeight: 48,
  borderRadius: radius.md,
  borderWidth: 0.5,
  borderColor: palette.border,
  paddingHorizontal: 16,
  backgroundColor: 'rgba(255,255,255,0.04)',
  color: palette.text,
  fontFamily: typography.body,
  fontSize: 15,
} as const;

export default function BikeSetupScreen() {
  const params = useLocalSearchParams<{ flow?: string }>();
  const setOnboardingStep = useAppStore((state) => state.setOnboardingStep);
  const setPreferredMode = useAppStore((state) => state.setPreferredMode);
  const setOnboardingData = useAppStore((state) => state.setOnboardingData);
  const onboardingData = useAppStore((state) => state.onboardingData);
  const isOnboarding = params.flow === 'onboarding';
  const initialBrand = onboardingData.bikeBrand && !bikeBrands.includes(onboardingData.bikeBrand)
    ? 'Other'
    : onboardingData.bikeBrand || '';

  const [brand, setBrand] = useState(initialBrand);
  const [brandCustom, setBrandCustom] = useState(initialBrand === 'Other' ? onboardingData.bikeBrand : '');
  const initialModels = initialBrand && initialBrand !== 'Other' ? getModelsForBrand(initialBrand) : [];
  const initialModelIsCustom = Boolean(onboardingData.bikeModel && initialModels.length && !initialModels.some((item) => item.name === onboardingData.bikeModel));
  const [model, setModel] = useState(initialModelIsCustom ? 'Other' : onboardingData.bikeModel || '');
  const [modelCustom, setModelCustom] = useState(initialModelIsCustom ? onboardingData.bikeModel : '');
  const [year, setYear] = useState(onboardingData.bikeYear || '');
  const [cc, setCc] = useState(onboardingData.bikeEngineCc || '');
  const [odometer, setOdometer] = useState(onboardingData.bikeOdometerKm || '');
  const [ridingStyle, setRidingStyle] = useState<RideMode>((onboardingData.ridingStyle as RideMode) || 'weekend');

  const brandSheetRef = useRef<PickerSheetRef>(null);
  const modelSheetRef = useRef<PickerSheetRef>(null);

  const brandModels = useMemo(() => (brand ? getModelsForBrand(brand) : []), [brand]);
  const finalBrand = brand === 'Other' ? brandCustom.trim() : brand.trim();
  const finalModel = model === 'Other' ? modelCustom.trim() : model.trim();
  const finalYear = year.trim();
  const finalCc = cc.trim();
  const finalOdometer = odometer.trim();
  const isBikeValid = Boolean(finalBrand && finalModel && finalYear && finalCc && finalOdometer);

  const brandOptions = useMemo(() => bikeBrands.map((b) => ({ label: b, value: b })), []);
  const modelOptions = useMemo(
    () => [...brandModels.map((m) => ({ label: m.name, value: m.name })), { label: 'Other', value: 'Other' }],
    [brandModels],
  );

  const syncDraft = (data: Partial<typeof onboardingData>) => {
    setOnboardingData(data);
  };

  const handleBrandSelect = (b: string) => {
    setBrand(b);
    setModel('');
    setModelCustom('');
    setCc('');
    if (b !== 'Other') setBrandCustom('');
    syncDraft({
      bikeBrand: b === 'Other' ? '' : b,
      bikeModel: '',
      bikeEngineCc: '',
    });
  };

  const handleModelSelect = (modelName: string) => {
    setModel(modelName);
    if (modelName === 'Other') {
      setModelCustom('');
      setCc('');
      syncDraft({ bikeModel: '', bikeEngineCc: '' });
      return;
    }
    const found = brandModels.find((m) => m.name === modelName);
    const nextCc = found ? found.cc.toString() : '';
    if (found) setCc(nextCc);
    syncDraft({ bikeModel: modelName, bikeEngineCc: nextCc || cc });
  };

  const handleNext = () => {
    if (!isBikeValid) {
      return;
    }

    setOnboardingData({
      bikeBrand: finalBrand,
      bikeModel: finalModel,
      bikeYear: finalYear,
      bikeEngineCc: finalCc,
      bikeOdometerKm: finalOdometer,
      ridingStyle,
    });
    setPreferredMode(ridingStyle);

    if (isOnboarding) {
      setOnboardingStep(4);
      router.push(getOnboardingRoute(4) as any);
    } else {
      router.replace('/(app)/(tabs)/ride');
    }
  };

  const brandDisplay = brand === 'Other' && brandCustom ? brandCustom : brand;

  const content = (
    <>
      {isOnboarding ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable onPress={() => { setOnboardingStep(1); router.replace(getOnboardingRoute(1) as any); }}>
            <Ionicons name="arrow-back" size={20} color={palette.textSecondary} />
          </Pressable>
          <AppText variant="label" style={{ color: palette.textSecondary }}>Step 2 of {ONBOARDING_TOTAL_STEPS}</AppText>
        </View>
      ) : null}
      <View style={{ gap: 8 }}>
        <AppText variant="screenTitle" style={{ fontSize: 30 }}>What do you ride?</AppText>
        <AppText variant="meta" style={{ color: palette.textSecondary }}>
          Pick your brand and model so Kurbada can estimate your fuel economy.
        </AppText>
      </View>

      <PickerTrigger label="Brand" value={brandDisplay} placeholder="Select brand" onPress={() => brandSheetRef.current?.present()} />

      {brand === 'Other' && (
        <TextInput
          value={brandCustom}
          onChangeText={(value) => {
            setBrandCustom(value);
            syncDraft({ bikeBrand: value.trim() });
          }}
          placeholder="Enter brand name"
          placeholderTextColor={palette.textTertiary}
          selectionColor={palette.danger}
          style={inputStyle}
        />
      )}

      {brand && brand !== 'Other' && (
        <PickerTrigger label="Model" value={model} placeholder="Select model" onPress={() => modelSheetRef.current?.present()} />
      )}

      {(brand === 'Other' || model === 'Other') && (
        <TextInput
          value={model === 'Other' ? modelCustom : model}
          onChangeText={(value) => {
            if (model === 'Other') {
              setModelCustom(value);
            } else {
              setModel(value);
            }
            syncDraft({ bikeModel: value.trim() });
          }}
          placeholder="Model"
          placeholderTextColor={palette.textTertiary}
          selectionColor={palette.danger}
          style={inputStyle}
        />
      )}

      <TextInput
        value={year}
        onChangeText={(value) => {
          setYear(value);
          syncDraft({ bikeYear: value.trim() });
        }}
        placeholder="Year (e.g. 2023)"
        placeholderTextColor={palette.textTertiary}
        keyboardType="number-pad"
        maxLength={4}
        selectionColor={palette.danger}
        style={inputStyle}
      />

      <TextInput
        value={cc}
        onChangeText={(value) => {
          setCc(value);
          syncDraft({ bikeEngineCc: value.trim() });
        }}
        placeholder="Engine CC"
        placeholderTextColor={palette.textTertiary}
        keyboardType="number-pad"
        selectionColor={palette.danger}
        style={inputStyle}
      />

      <TextInput
        value={odometer}
        onChangeText={(value) => {
          setOdometer(value);
          syncDraft({ bikeOdometerKm: value.trim() });
        }}
        placeholder="Current Odometer (km)"
        placeholderTextColor={palette.textTertiary}
        keyboardType="number-pad"
        selectionColor={palette.danger}
        style={inputStyle}
      />

      <View style={{ gap: 8 }}>
        <AppText variant="label" style={{ color: palette.textSecondary, fontSize: 12 }}>Riding Style</AppText>
        {ridingStyles.map((style) => (
          <Pressable
            key={style.mode}
            onPress={() => {
              setRidingStyle(style.mode);
              syncDraft({ ridingStyle: style.mode });
            }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.md, borderWidth: ridingStyle === style.mode ? 0 : 1.5, borderColor: palette.border, backgroundColor: ridingStyle === style.mode ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)', paddingHorizontal: 16, paddingVertical: 14 }}>
            <Ionicons name={style.icon as any} size={22} color={ridingStyle === style.mode ? palette.text : palette.textSecondary} />
            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="bodyBold" style={{ color: ridingStyle === style.mode ? palette.text : palette.textSecondary }}>{style.label}</AppText>
              <AppText variant="meta" style={{ fontSize: 12, color: palette.textTertiary }}>{style.subtitle}</AppText>
            </View>
          </Pressable>
        ))}
      </View>
    </>
  );

  const pickerSheets = (
    <>
      <PickerSheet
        ref={brandSheetRef}
        title="Select brand"
        options={brandOptions}
        selectedValue={brand}
        onSelect={handleBrandSelect}
      />
      <PickerSheet
        ref={modelSheetRef}
        title="Select model"
        options={modelOptions}
        selectedValue={model}
        onSelect={handleModelSelect}
      />
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
              keyboardShouldPersistTaps="always">
              {content}
            </ScrollView>
            <Button title="Next →" onPress={handleNext} disabled={!isBikeValid} />
          </GlassCard>
        </KeyboardAvoidingView>
        {pickerSheets}
      </AppScreen>
    );
  }

  return (
    <AppScrollScreen
      keyboardShouldPersistTaps="always"
      contentContainerStyle={{ flexGrow: 1 }}>
      <GlassCard style={{ gap: 18, padding: 22 }}>
        {content}
        <Button title="Next →" onPress={handleNext} disabled={!isBikeValid} />
      </GlassCard>
      {pickerSheets}
    </AppScrollScreen>
  );
}
