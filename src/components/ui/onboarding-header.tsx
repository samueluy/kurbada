import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { palette } from '@/constants/theme';
import { ONBOARDING_TOTAL_STEPS } from '@/lib/onboarding-flow';

export function OnboardingHeader({ step, onBack }: { step: number; onBack?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 4 }}>
      {onBack ? (
        <Pressable
          onPress={onBack}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel="Back to previous step">
          <Ionicons name="arrow-back" size={20} color={palette.textSecondary} />
        </Pressable>
      ) : null}
      <AppText variant="label" style={{ color: palette.textSecondary }}>
        Step {step} of {ONBOARDING_TOTAL_STEPS}
      </AppText>
    </View>
  );
}
