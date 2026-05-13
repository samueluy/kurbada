import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { AppScreen } from '@/components/ui/app-screen';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { palette, radius } from '@/constants/theme';
import { triggerLightHaptic } from '@/lib/haptics';
import { getOnboardingRoute, ONBOARDING_TOTAL_STEPS } from '@/lib/onboarding-flow';
import { useAppStore, type RidingPersona } from '@/store/app-store';

type PersonaOption = {
  id: RidingPersona;
  icon: string;
  title: string;
  body: string;
};

const options: PersonaOption[] = [
  { id: 'leisure', icon: 'compass-outline', title: 'Weekend / Leisure', body: 'Twisties, long rides, group runs on your day off.' },
  { id: 'commute', icon: 'bicycle-outline', title: 'Daily Commute', body: 'To work and back. Fuel and maintenance matter most.' },
  { id: 'work', icon: 'briefcase-outline', title: 'Work / Delivery', body: 'Grab, Lalamove, FoodPanda, courier. Income tracking.' },
  { id: 'mix', icon: 'shuffle-outline', title: 'A Mix of Everything', body: 'Daily grind + weekend rides. Use the full app.' },
];

export default function OnboardingFeaturesScreen() {
  const setOnboardingStep = useAppStore((state) => state.setOnboardingStep);
  const setRidingPersona = useAppStore((state) => state.setRidingPersona);
  const setWorkMode = useAppStore((state) => state.setWorkMode);
  const ridingPersona = useAppStore((state) => state.ridingPersona);
  const [selected, setSelected] = useState<RidingPersona>(ridingPersona ?? 'leisure');

  const handleContinue = () => {
    triggerLightHaptic();
    setRidingPersona(selected);
    // Auto-enable work mode if the rider picks work persona
    if (selected === 'work') setWorkMode(true);
    setOnboardingStep(5);
    router.push(getOnboardingRoute(5) as any);
  };

  return (
    <AppScreen style={{ padding: 0 }} showWordmark={false}>
      <GlassCard style={{ flex: 1, borderRadius: 0, paddingVertical: 28, paddingHorizontal: 24, gap: 18 }}>
        <ScrollView contentContainerStyle={{ gap: 20, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Pressable
              onPress={() => {
                triggerLightHaptic();
                setOnboardingStep(3);
                if (router.canGoBack()) {
                  router.back();
                  return;
                }
                router.replace(getOnboardingRoute(3) as any);
              }}>
              <Ionicons name="arrow-back" size={20} color={palette.textSecondary} />
            </Pressable>
            <AppText variant="label" style={{ color: palette.textSecondary }}>Step 4 of {ONBOARDING_TOTAL_STEPS}</AppText>
          </View>

          <View style={{ alignItems: 'center', gap: 10 }}>
            <AppText variant="screenTitle" style={{ textAlign: 'center', fontSize: 28 }}>
              How do you ride?
            </AppText>
            <AppText variant="meta" style={{ textAlign: 'center', color: palette.textSecondary }}>
              We&apos;ll prioritize the right screens for you. Change it anytime in Profile.
            </AppText>
          </View>

          <View style={{ gap: 12 }}>
            {options.map((opt) => {
              const active = selected === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => {
                    triggerLightHaptic();
                    setSelected(opt.id);
                  }}
                  style={{
                    flexDirection: 'row',
                    gap: 14,
                    padding: 16,
                    borderRadius: radius.lg,
                    borderWidth: 1,
                    borderColor: active ? palette.danger : palette.border,
                    backgroundColor: active ? 'rgba(198,69,55,0.08)' : 'rgba(255,255,255,0.03)',
                  }}>
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      backgroundColor: active ? 'rgba(198,69,55,0.15)' : 'rgba(255,255,255,0.06)',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <Ionicons name={opt.icon as any} size={22} color={active ? palette.danger : palette.text} />
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
                    <AppText variant="bodyBold">{opt.title}</AppText>
                    <AppText variant="meta" style={{ color: palette.textSecondary }}>
                      {opt.body}
                    </AppText>
                  </View>
                  {active ? <Ionicons name="checkmark-circle" size={22} color={palette.danger} /> : null}
                </Pressable>
              );
            })}
          </View>
        </ScrollView>

        <Button title="Next →" onPress={handleContinue} style={{ backgroundColor: palette.danger }} />
      </GlassCard>
    </AppScreen>
  );
}
