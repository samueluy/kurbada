import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { AppScrollScreen } from '@/components/ui/app-screen';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { ProgressDots } from '@/components/ui/progress-dots';
import { palette, radius } from '@/constants/theme';
import { useAppStore } from '@/store/app-store';
import type { RideMode } from '@/types/domain';

const bikeBrands = [
  'Honda', 'Yamaha', 'Kawasaki', 'Suzuki', 'KTM',
  'Ducati', 'BMW', 'Harley-Davidson', 'Royal Enfield', 'CFMoto',
  'Other',
];

const ccClasses = [
  'Under 150',
  '150–200',
  '250–400',
  '500–650',
  '700–1000',
  '1000+',
];

const ridingStyles: { mode: RideMode; label: string; subtitle: string; icon: string }[] = [
  { mode: 'weekend', label: 'Weekend Twisties', subtitle: 'Cinematic telemetry, curves, max lean', icon: 'speedometer-outline' },
  { mode: 'hustle', label: 'Daily Ride', subtitle: 'Traffic efficiency, fuel tracking, battery smart', icon: 'timer-outline' },
];

export default function BikeSetupScreen() {
  const params = useLocalSearchParams<{ flow?: string }>();
  const setOnboardingStep = useAppStore((state) => state.setOnboardingStep);
  const setPreferredMode = useAppStore((state) => state.setPreferredMode);
  const setOnboardingData = useAppStore((state) => state.setOnboardingData);
  const onboardingData = useAppStore((state) => state.onboardingData);
  const completeBikeSetup = useAppStore((state) => state.completeBikeSetup);

  const [brand, setBrand] = useState(onboardingData.bikeBrand || 'Kawasaki');
  const [brandDropdown, setBrandDropdown] = useState(false);
  const [brandCustom, setBrandCustom] = useState('');
  const [ccClass, setCcClass] = useState(onboardingData.ccClass || '250–400');
  const [ccDropdown, setCcDropdown] = useState(false);
  const [ridingStyle, setRidingStyle] = useState<RideMode>(onboardingData.ridingStyle || 'weekend');
  const isOnboarding = params.flow === 'onboarding';

  const handleNext = () => {
    const finalBrand = brand === 'Other' ? brandCustom.trim() || 'Other' : brand;

    setOnboardingData({
      bikeBrand: finalBrand,
      ccClass,
      ridingStyle,
    });
    setPreferredMode(ridingStyle);
    completeBikeSetup();

    if (isOnboarding) {
      setOnboardingStep(3);
      router.replace('/(public)/emergency?flow=onboarding');
    } else {
      router.replace('/(app)/(tabs)/ride');
    }
  };

  return (
    <AppScrollScreen contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
      <GlassCard style={{ gap: 18, padding: 22 }}>
        {isOnboarding ? (
          <>
            <ProgressDots total={7} current={2} />
            <AppText variant="label" style={{ color: palette.textSecondary }}>
              Step 2 of 7
            </AppText>
          </>
        ) : null}
        <View style={{ gap: 8 }}>
          <AppText variant="screenTitle" style={{ fontSize: 30 }}>
            What do you ride?
          </AppText>
          <AppText variant="meta" style={{ color: palette.textSecondary }}>
            {isOnboarding
              ? 'Set up your machine and riding style so Kurbada tailors your experience.'
              : 'Add your bike now, or come back from the Garage tab.'}
          </AppText>
        </View>

        <View style={{ gap: 6 }}>
          <AppText variant="label" style={{ color: palette.textSecondary, fontSize: 12 }}>Bike Brand</AppText>
          <Pressable
            onPress={() => { setBrandDropdown(!brandDropdown); setCcDropdown(false); }}
            style={{ paddingVertical: 14, paddingHorizontal: 16, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 0.5, borderColor: palette.border }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <AppText variant="body">{brand === 'Other' && brandCustom ? brandCustom : brand}</AppText>
              <MaterialCommunityIcons name={brandDropdown ? 'chevron-up' : 'chevron-down'} size={20} color={palette.textSecondary} />
            </View>
          </Pressable>
          {brandDropdown && (
            <View style={{ borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              {bikeBrands.map((b) => (
                <Pressable
                  key={b}
                  onPress={() => { setBrand(b); setBrandDropdown(false); if (b !== 'Other') setBrandCustom(''); }}
                  style={{ paddingVertical: 12, paddingHorizontal: 16, backgroundColor: brand === b ? 'rgba(255,255,255,0.08)' : 'transparent' }}>
                  <AppText variant="body" style={{ color: brand === b ? palette.text : palette.textSecondary }}>{b}</AppText>
                </Pressable>
              ))}
            </View>
          )}
          {brand === 'Other' && (
            <TextInput
              value={brandCustom}
              onChangeText={setBrandCustom}
              placeholder="Enter brand name"
              placeholderTextColor={palette.textTertiary}
              style={{ minHeight: 48, borderRadius: radius.md, borderWidth: 0.5, borderColor: palette.border, paddingHorizontal: 16, backgroundColor: 'rgba(255,255,255,0.04)', color: palette.text }}
            />
          )}
        </View>

        <View style={{ gap: 6 }}>
          <AppText variant="label" style={{ color: palette.textSecondary, fontSize: 12 }}>CC Class</AppText>
          <Pressable
            onPress={() => { setCcDropdown(!ccDropdown); setBrandDropdown(false); }}
            style={{ paddingVertical: 14, paddingHorizontal: 16, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 0.5, borderColor: palette.border }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <AppText variant="body">{ccClass}</AppText>
              <MaterialCommunityIcons name={ccDropdown ? 'chevron-up' : 'chevron-down'} size={20} color={palette.textSecondary} />
            </View>
          </Pressable>
          {ccDropdown && (
            <View style={{ borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              {ccClasses.map((cc) => (
                <Pressable
                  key={cc}
                  onPress={() => { setCcClass(cc); setCcDropdown(false); }}
                  style={{ paddingVertical: 12, paddingHorizontal: 16, backgroundColor: ccClass === cc ? 'rgba(255,255,255,0.08)' : 'transparent' }}>
                  <AppText variant="body" style={{ color: ccClass === cc ? palette.text : palette.textSecondary }}>{cc}</AppText>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <View style={{ gap: 8 }}>
          <AppText variant="label" style={{ color: palette.textSecondary, fontSize: 12 }}>
            Riding Style
          </AppText>
          {ridingStyles.map((style) => (
            <Pressable
              key={style.mode}
              onPress={() => setRidingStyle(style.mode)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                borderRadius: radius.md,
                borderWidth: ridingStyle === style.mode ? 0 : 1.5,
                borderColor: palette.border,
                backgroundColor: ridingStyle === style.mode ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
                paddingHorizontal: 16,
                paddingVertical: 14,
              }}>
              <MaterialCommunityIcons
                name={style.icon as any}
                size={22}
                color={ridingStyle === style.mode ? palette.text : palette.textSecondary}
              />
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="bodyBold" style={{ color: ridingStyle === style.mode ? palette.text : palette.textSecondary }}>
                  {style.label}
                </AppText>
                <AppText variant="meta" style={{ fontSize: 12, color: palette.textTertiary }}>
                  {style.subtitle}
                </AppText>
              </View>
            </Pressable>
          ))}
        </View>

        <Button title="Next →" onPress={handleNext} />
      </GlassCard>
    </AppScrollScreen>
  );
}
