import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { AppScreen } from '@/components/ui/app-screen';
import { Button } from '@/components/ui/button';
import { palette, radius } from '@/constants/theme';
import { useAppStore } from '@/store/app-store';

export default function OnboardingScreen() {
  const setOnboardingStep = useAppStore((state) => state.setOnboardingStep);
  const completeOnboarding = useAppStore((state) => state.completeOnboarding);

  return (
    <AppScreen style={{ justifyContent: 'center' }}>
      <LinearGradient
        colors={['#060606', '#0A0A0A', '#0D0D0D']}
        style={{ position: 'absolute', inset: 0 }}
      />
      <View style={{ flex: 1, justifyContent: 'space-between', paddingHorizontal: 28, paddingVertical: 48 }}>
        <View />

        <View style={{ alignItems: 'center', gap: 36 }}>
          <View
            style={{
              width: 140,
              height: 140,
              borderRadius: 70,
              backgroundColor: 'rgba(198,69,55,0.06)',
              borderWidth: 1,
              borderColor: 'rgba(198,69,55,0.18)',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#C64537',
              shadowOpacity: 0.3,
              shadowRadius: 24,
              shadowOffset: { width: 0, height: 0 },
            }}>
            <Ionicons name="speedometer-outline" size={68} color={palette.danger} />
          </View>

          <View style={{ alignItems: 'center', gap: 16 }}>
            <AppText variant="screenTitle" style={{ textAlign: 'center', fontSize: 36, lineHeight: 44, letterSpacing: -0.5 }}>
              Master the Lean.{'\n'}Track the Hustle.
            </AppText>
            <AppText variant="meta" style={{ textAlign: 'center', color: palette.textSecondary, lineHeight: 22, maxWidth: 280 }}>
              The all-in-one telemetry and utility companion for Filipino riders.
            </AppText>
          </View>
        </View>

        <View style={{ gap: 16 }}>
          <Button
            title="Set Up My Garage"
            onPress={() => {
              setOnboardingStep(2);
              router.replace('/(public)/bike-setup?flow=onboarding');
            }}
            style={{
              backgroundColor: palette.danger,
              borderRadius: radius.pill,
              minHeight: 56,
              shadowColor: '#C64537',
              shadowOpacity: 0.4,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 4 },
            }}
          />
          <Button
            title="Already have an account?"
            variant="ghost"
            onPress={() => {
              completeOnboarding();
              router.replace('/(public)/auth/sign-in');
            }}
          />
        </View>
      </View>
    </AppScreen>
  );
}
