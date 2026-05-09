import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { AppScrollScreen } from '@/components/ui/app-screen';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { palette, radius, typography } from '@/constants/theme';
import { useAppStore } from '@/store/app-store';
import { bikeBrands, getModelsForBrand } from '@/lib/bike-models';
import { getOnboardingRoute, ONBOARDING_TOTAL_STEPS } from '@/lib/onboarding-flow';
import type { RideMode } from '@/types/domain';

const ridingStyles: { mode: RideMode; label: string; subtitle: string; icon: string }[] = [
  { mode: 'weekend', label: 'Weekend Twisties', subtitle: 'Cinematic telemetry, curves, max lean', icon: 'speedometer-outline' },
  { mode: 'hustle', label: 'Daily Ride', subtitle: 'Traffic efficiency, fuel tracking, battery smart', icon: 'timer-outline' },
];

function Dropdown({ label, value, placeholder, open, onToggle, children }: { label: string; value: string; placeholder: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6, position: 'relative', zIndex: open ? 10 : 1 }}>
      <AppText variant="label" style={{ color: palette.textSecondary, fontSize: 12 }}>{label}</AppText>
      <Pressable
        onPress={onToggle}
        style={{ paddingVertical: 14, paddingHorizontal: 16, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 0.5, borderColor: palette.border }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <AppText variant="body" style={{ color: value ? palette.text : palette.textTertiary }}>{value || placeholder}</AppText>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={palette.textSecondary} />
        </View>
      </Pressable>
      {open && (
        <View style={{ position: 'absolute', top: '100%', left: 0, right: 0, borderRadius: radius.md, backgroundColor: '#1E1E1E', borderWidth: 0.5, borderColor: palette.border, maxHeight: 220, zIndex: 20, elevation: 10, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, overflow: 'hidden' }}>
          <ScrollView bounces={false} nestedScrollEnabled showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

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
  const [brandOpen, setBrandOpen] = useState(false);
  const [brandCustom, setBrandCustom] = useState(initialBrand === 'Other' ? onboardingData.bikeBrand : '');
  const initialModels = initialBrand && initialBrand !== 'Other' ? getModelsForBrand(initialBrand) : [];
  const initialModelIsCustom = Boolean(onboardingData.bikeModel && initialModels.length && !initialModels.some((item) => item.name === onboardingData.bikeModel));
  const [model, setModel] = useState(initialModelIsCustom ? 'Other' : onboardingData.bikeModel || '');
  const [modelCustom, setModelCustom] = useState(initialModelIsCustom ? onboardingData.bikeModel : '');
  const [modelOpen, setModelOpen] = useState(false);
  const [cc, setCc] = useState(onboardingData.bikeEngineCc || '');
  const [ridingStyle, setRidingStyle] = useState<RideMode>((onboardingData.ridingStyle as RideMode) || 'weekend');

  const brandModels = brand ? getModelsForBrand(brand) : [];
  const finalBrand = brand === 'Other' ? brandCustom.trim() : brand.trim();
  const finalModel = model === 'Other' ? modelCustom.trim() : model.trim();
  const finalCc = cc.trim();
  const isBikeValid = Boolean(finalBrand && finalModel && finalCc);

  const syncDraft = (data: Partial<typeof onboardingData>) => {
    setOnboardingData(data);
  };

  const handleBrandSelect = (b: string) => {
    setBrand(b);
    setBrandOpen(false);
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
    setModelOpen(false);
    const found = brandModels.find((m) => m.name === modelName);
    const nextCc = found ? found.cc.toString() : '';
    if (found) setCc(nextCc);
    syncDraft({ bikeModel: modelName, bikeEngineCc: nextCc || cc });
  };

  const handleNext = () => {
    if (!isBikeValid) {
      return;
    }

    setOnboardingData({ bikeBrand: finalBrand, bikeModel: finalModel, bikeEngineCc: finalCc, ridingStyle });
    setPreferredMode(ridingStyle);

    if (isOnboarding) {
      setOnboardingStep(3);
      router.push(getOnboardingRoute(3) as any);
    } else {
      router.replace('/(app)/(tabs)/ride');
    }
  };

  return (
    <AppScrollScreen
      scrollEnabled={!brandOpen && !modelOpen}
      keyboardShouldPersistTaps="always"
      contentContainerStyle={{ flexGrow: 1 }}>
      <GlassCard style={{ gap: 18, padding: 22 }}>
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

        <Dropdown label="Brand" value={brand === 'Other' && brandCustom ? brandCustom : brand} placeholder="Select brand" open={brandOpen} onToggle={() => { setBrandOpen(!brandOpen); setModelOpen(false); }}>
          {bikeBrands.map((b) => (
            <Pressable key={b} onPress={() => handleBrandSelect(b)} style={{ paddingVertical: 12, paddingHorizontal: 16, backgroundColor: brand === b ? 'rgba(255,255,255,0.08)' : 'transparent' }}>
              <AppText variant="body" style={{ color: brand === b ? palette.text : palette.textSecondary }}>{b}</AppText>
            </Pressable>
          ))}
        </Dropdown>

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
            style={{ minHeight: 48, borderRadius: radius.md, borderWidth: 0.5, borderColor: palette.border, paddingHorizontal: 16, backgroundColor: 'rgba(255,255,255,0.04)', color: palette.text, fontFamily: typography.body, fontSize: 15 }}
          />
        )}

        {brand && brand !== 'Other' && (
          <Dropdown label="Model" value={model} placeholder="Select model" open={modelOpen} onToggle={() => { setModelOpen(!modelOpen); setBrandOpen(false); }}>
            {brandModels.map((m) => (
              <Pressable key={m.name} onPress={() => handleModelSelect(m.name)} style={{ paddingVertical: 12, paddingHorizontal: 16, backgroundColor: model === m.name ? 'rgba(255,255,255,0.08)' : 'transparent' }}>
                <AppText variant="body" style={{ color: model === m.name ? palette.text : palette.textSecondary }}>{m.name}</AppText>
              </Pressable>
            ))}
            <Pressable
              onPress={() => {
                setModel('Other');
                setModelCustom('');
                setModelOpen(false);
                setCc('');
                syncDraft({ bikeModel: '', bikeEngineCc: '' });
              }}
              style={{ paddingVertical: 12, paddingHorizontal: 16, backgroundColor: model === 'Other' ? 'rgba(255,255,255,0.08)' : 'transparent' }}>
              <AppText variant="body" style={{ color: model === 'Other' ? palette.text : palette.textSecondary }}>Other</AppText>
            </Pressable>
          </Dropdown>
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
            style={{ minHeight: 48, borderRadius: radius.md, borderWidth: 0.5, borderColor: palette.border, paddingHorizontal: 16, backgroundColor: 'rgba(255,255,255,0.04)', color: palette.text, fontFamily: typography.body, fontSize: 15 }}
          />
        )}

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
          style={{ minHeight: 48, borderRadius: radius.md, borderWidth: 0.5, borderColor: palette.border, paddingHorizontal: 16, backgroundColor: 'rgba(255,255,255,0.04)', color: palette.text, fontFamily: typography.body, fontSize: 15 }}
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

        <Button title="Next →" onPress={handleNext} disabled={!isBikeValid} />
      </GlassCard>
    </AppScrollScreen>
  );
}
