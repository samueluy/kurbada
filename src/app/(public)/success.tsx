import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { AppScreen } from '@/components/ui/app-screen';
import { Button } from '@/components/ui/button';
import { palette, radius } from '@/constants/theme';
import { useAppStore } from '@/store/app-store';

export default function OnboardingSuccessScreen() {
  const completeOnboarding = useAppStore((state) => state.completeOnboarding);
  const onboardingData = useAppStore((state) => state.onboardingData);
  const isWeekend = onboardingData.ridingStyle === 'weekend';

  const handleDropIn = () => {
    completeOnboarding();
    router.replace('/');
  };

  return (
    <AppScreen style={{ justifyContent: 'center' }}>
      <LinearGradient
        colors={['#060606', '#0A0A0A', '#0D0D0D']}
        style={{ position: 'absolute', inset: 0 }}
      />
      <View style={{ flex: 1, justifyContent: 'space-between', paddingHorizontal: 28, paddingVertical: 56 }}>
        <View />

        <View style={{ alignItems: 'center', gap: 36 }}>
          <View
            style={{
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: 'rgba(198,69,55,0.08)',
              borderWidth: 1,
              borderColor: 'rgba(198,69,55,0.24)',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Ionicons name="checkmark-circle-outline" size={64} color={palette.danger} />
          </View>

          <View style={{ alignItems: 'center', gap: 16 }}>
            <AppText variant="screenTitle" style={{ textAlign: 'center', fontSize: 34, lineHeight: 42 }}>
              Ignition On.{'\n'}Premium Unlocked.
            </AppText>
            <AppText variant="meta" style={{ textAlign: 'center', color: palette.textSecondary, lineHeight: 22, maxWidth: 300 }}>
              Welcome to the inner circle of data-driven riders.
            </AppText>
          </View>

          <View style={{ paddingHorizontal: 16, paddingVertical: 14, borderRadius: radius.lg, backgroundColor: 'rgba(255,255,255,0.04)', maxWidth: 320 }}>
            <AppText variant="meta" style={{ color: palette.textSecondary, textAlign: 'center', lineHeight: 20 }}>
              {isWeekend
                ? 'Your lean angle sensors are calibrated. Time to conquer the twisties.'
                : 'Your fuel ledger is active. Let&apos;s protect your daily earnings.'}
            </AppText>
          </View>
        </View>

        <View style={{ gap: 16 }}>
          <Button
            title="Drop into My Garage"
            onPress={handleDropIn}
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
          <AppText variant="label" style={{ color: palette.textTertiary, textAlign: 'center', fontSize: 11 }}>
            Step 7 of 7
          </AppText>
        </View>
      </View>
    </AppScreen>
  );
}
