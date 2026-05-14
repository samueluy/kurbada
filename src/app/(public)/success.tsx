import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { AppScreen } from '@/components/ui/app-screen';
import { Button } from '@/components/ui/button';
import { palette, radius } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useBikes } from '@/hooks/use-kurbada-data';
import { hasFailedOnboardingSyncForUser, hasPendingOnboardingSyncForUser } from '@/lib/onboarding-sync';
import { useAppStore } from '@/store/app-store';

export default function OnboardingSuccessScreen() {
  const { session } = useAuth();
  const completeOnboarding = useAppStore((state) => state.completeOnboarding);
  const completeBikeSetup = useAppStore((state) => state.completeBikeSetup);
  const preferredMode = useAppStore((state) => state.preferredMode);
  const onboardingStep = useAppStore((state) => state.onboardingStep);
  const purchaseCompleted = useAppStore((state) => state.purchaseCompleted);
  const onboardingDraftScope = useAppStore((state) => state.onboardingDraftScope);
  const onboardingDraftTargetMode = useAppStore((state) => state.onboardingDraftTargetMode);
  const onboardingDraftTargetEmail = useAppStore((state) => state.onboardingDraftTargetEmail);
  const onboardingSyncStatus = useAppStore((state) => state.onboardingSyncStatus);
  const onboardingSyncedBikeId = useAppStore((state) => state.onboardingSyncedBikeId);
  const resetOnboardingSyncStatus = useAppStore((state) => state.resetOnboardingSyncStatus);
  const isWeekend = preferredMode === 'weekend';
  const bikes = useBikes(session?.user.id);
  const hasRemoteBike = (bikes.data?.length ?? 0) > 0;
  const hasPendingOnboardingSync = hasPendingOnboardingSyncForUser({
    scope: onboardingDraftScope,
    targetMode: onboardingDraftTargetMode,
    targetEmail: onboardingDraftTargetEmail,
    status: onboardingSyncStatus,
    userEmail: session?.user.email,
  });
  const hasFailedOnboardingSync = hasFailedOnboardingSyncForUser({
    scope: onboardingDraftScope,
    targetMode: onboardingDraftTargetMode,
    targetEmail: onboardingDraftTargetEmail,
    status: onboardingSyncStatus,
    userEmail: session?.user.email,
  });
  const isSetupReady = hasRemoteBike || Boolean(onboardingSyncedBikeId);
  const isFinishingSetup =
    Boolean(session?.user.id)
    && purchaseCompleted
    && onboardingStep === 7
    && !isSetupReady
    && hasPendingOnboardingSync;

  const handleDropIn = () => {
    completeOnboarding();
    if (isSetupReady) {
      completeBikeSetup();
    }
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
              {isFinishingSetup
                ? 'Premium is unlocked. We are finishing your garage in the background.'
                : hasFailedOnboardingSync
                  ? 'Premium is unlocked, but your bike setup still needs one more step.'
                  : 'Welcome to the inner circle of data-driven riders.'}
            </AppText>
          </View>

          <View style={{ paddingHorizontal: 16, paddingVertical: 14, borderRadius: radius.lg, backgroundColor: 'rgba(255,255,255,0.04)', maxWidth: 320 }}>
            <AppText variant="meta" style={{ color: palette.textSecondary, textAlign: 'center', lineHeight: 20 }}>
              {isFinishingSetup
                ? 'Finishing your garage… This should only take a moment.'
                : hasFailedOnboardingSync
                  ? 'Your trial is active, but your bike did not finish saving yet. Retry setup or add it manually now.'
                  : isWeekend
                    ? 'Your lean angle sensors are calibrated. Time to conquer the twisties.'
                    : 'Your fuel ledger is active. Let&apos;s protect your daily earnings.'}
            </AppText>
          </View>
        </View>

        <View style={{ gap: 16 }}>
          <Button
            title={isFinishingSetup ? 'Finishing your garage…' : hasFailedOnboardingSync ? 'Add Bike Now' : 'Drop into My Garage'}
            onPress={hasFailedOnboardingSync ? () => router.replace('/(public)/bike-setup') : handleDropIn}
            disabled={isFinishingSetup || (!hasFailedOnboardingSync && !isSetupReady && Boolean(session?.user.id))}
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
          {hasFailedOnboardingSync ? (
            <Button
              title="Retry Setup"
              variant="secondary"
              onPress={() => resetOnboardingSyncStatus()}
            />
          ) : null}
          <AppText variant="label" style={{ color: palette.textTertiary, textAlign: 'center', fontSize: 11 }}>
            {isFinishingSetup ? 'Syncing bike setup' : hasFailedOnboardingSync ? 'Bike setup needs attention' : 'Setup complete'}
          </AppText>
        </View>
      </View>
    </AppScreen>
  );
}
