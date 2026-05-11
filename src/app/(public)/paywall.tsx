import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { AppScreen } from '@/components/ui/app-screen';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { palette, radius } from '@/constants/theme';
import { env } from '@/lib/env';
import { normalizeReferralCode, validateReferralCode } from '@/lib/referrals';
import { getCurrentOffering, getCurrentOfferingPackage, purchasePremium, restorePremiumPurchases, type RevenueCatPackage } from '@/services/revenuecat';
import { useAuth } from '@/hooks/use-auth';
import { useReferralMutations } from '@/hooks/use-kurbada-data';
import { useUserProfile } from '@/hooks/use-user-access';
import { useAppStore } from '@/store/app-store';
import { LinearGradient } from 'expo-linear-gradient';

const features = [
  ['Honest Ride Tracking', 'Route, speed, duration, and fuel cost per run. No inflated metrics.'],
  ['Emergency QR Lockscreen', 'Share the right info when every second matters.'],
  ['Shareable Ride Cards', 'Export polished ride summaries for social sharing.'],
  ['Maintenance Tracker', 'Keep service intervals and reminders in one place.'],
  ['Work Mode (optional)', 'Log earnings, see net income, export monthly reports.'],
];

export default function PaywallScreen() {
  const params = useLocalSearchParams<{ context?: string }>();
  const { session } = useAuth();
  const profile = useUserProfile(session?.user.id);
  const { applyReferralCode } = useReferralMutations(session?.user.id);
  const setOnboardingStep = useAppStore((state) => state.setOnboardingStep);
  const setPurchaseCompleted = useAppStore((state) => state.setPurchaseCompleted);
  const completeOnboarding = useAppStore((state) => state.completeOnboarding);
  const hasCompletedOnboarding = useAppStore((state) => state.hasCompletedOnboarding);
  const purchaseCompleted = useAppStore((state) => state.purchaseCompleted);
  const pendingReferralCode = useAppStore((state) => state.pendingReferralCode);
  const setPendingReferralCode = useAppStore((state) => state.setPendingReferralCode);
  const [showReferralField, setShowReferralField] = useState(Boolean(pendingReferralCode));
  const [referralCode, setReferralCode] = useState(pendingReferralCode);
  const [referralError, setReferralError] = useState('');
  const [referralSuccess, setReferralSuccess] = useState('');
  const [isValidatingReferral, setIsValidatingReferral] = useState(false);
  const [offeringPackage, setOfferingPackage] = useState<RevenueCatPackage | null>(null);
  const [isLoadingOffering, setIsLoadingOffering] = useState(env.revenueCatEnabled);
  const [purchaseError, setPurchaseError] = useState('');
  const [isPurchasing, setIsPurchasing] = useState(false);
  const isOnboardingPaywall = params.context === 'onboarding';

  useEffect(() => {
    // Returning user: auto-complete onboarding so gate doesn't loop
    if (session && !hasCompletedOnboarding && !isOnboardingPaywall) {
      completeOnboarding();
    }
  }, [session, hasCompletedOnboarding, isOnboardingPaywall, completeOnboarding]);

  useEffect(() => {
    if (pendingReferralCode) {
      setReferralCode(pendingReferralCode);
      setShowReferralField(true);
      setReferralSuccess('Referral code ready to apply.');
    }
  }, [pendingReferralCode]);

  useEffect(() => {
    if (!env.revenueCatEnabled) {
      setIsLoadingOffering(false);
      return;
    }

    let cancelled = false;

    const loadOffering = async () => {
      setIsLoadingOffering(true);
      setPurchaseError('');

      try {
        const [offering, selectedPackage] = await Promise.all([
          getCurrentOffering(true),
          getCurrentOfferingPackage(true),
        ]);
        if (cancelled) {
          return;
        }

        setOfferingPackage(selectedPackage);
        if (!offering || !selectedPackage) {
          setPurchaseError('No monthly Premium package is currently available in RevenueCat.');
        }
      } catch (error) {
        if (!cancelled) {
          setPurchaseError(error instanceof Error ? error.message : 'Unable to load Premium offering.');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingOffering(false);
        }
      }
    };

    void loadOffering();

    return () => {
      cancelled = true;
    };
  }, []);

  const runPurchaseFlow = async () => {
    setPurchaseError('');
    setIsPurchasing(true);
    try {
      const result = await purchasePremium();
      if (result.success) {
        setPurchaseCompleted(true);
        setOnboardingStep(8);
        router.replace('/(public)/success' as any);
        return;
      }

      if (!result.cancelled) {
        setPurchaseError(result.reason);
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  // Auto-fire StoreKit sheet on onboarding paywall is intentionally disabled.
  // Keep the purchase flow strictly button-driven so users confirm before the payment sheet opens.

  const handleStartTrial = async () => {
    setPurchaseError('');

    if (!session?.user.id && env.revenueCatEnabled) {
      if (referralCode.trim()) {
        setPendingReferralCode(normalizeReferralCode(referralCode));
      }
      router.push('/(public)/auth/sign-up');
      return;
    }

    if (!env.revenueCatEnabled) {
      setPurchaseCompleted(true);
      setOnboardingStep(8);
      router.replace('/(public)/success' as any);
      return;
    }

    await runPurchaseFlow();
  };

  const handleValidateReferral = async () => {
    setIsValidatingReferral(true);
    setReferralError('');
    setReferralSuccess('');

    try {
      const validation = await validateReferralCode(referralCode, session?.user.id);

      if (!validation.valid) {
        setReferralError(validation.reason);
        return;
      }

      setPendingReferralCode(validation.normalizedCode);

      if (session?.user.id) {
        await applyReferralCode.mutateAsync({
          code: validation.normalizedCode,
          referredDisplayName: profile.data?.display_name,
        });
        setReferralSuccess(`${validation.referrer.display_name}'s code is locked in.`);
      } else {
        setReferralSuccess(`${validation.referrer.display_name}'s code will be applied after you create your account.`);
      }
    } catch (error) {
      setReferralError(error instanceof Error ? error.message : 'Unable to validate that referral code.');
    } finally {
      setIsValidatingReferral(false);
    }
  };

  const body = (
    <View style={{ gap: 18 }}>
      {isOnboardingPaywall ? (
        <>
          <AppText variant="label" style={{ color: palette.textSecondary, textAlign: 'center' }}>
            Step 7 of 7
          </AppText>
          <Pressable
            onPress={() => { setOnboardingStep(6); router.replace('/(public)/permissions' as any); }}
            style={{ alignSelf: 'center', padding: 4 }}>
            <Ionicons name="arrow-back" size={20} color={palette.textSecondary} />
          </Pressable>
        </>
      ) : null}
      <View style={{ gap: 0 }}>
        <View style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: 20, gap: 12 }}>
          <AppText variant="label" style={{ color: palette.textSecondary }}>
            Kurbada Premium
          </AppText>
          <AppText variant="screenTitle" style={{ fontSize: 34, lineHeight: 36 }}>
            UNLOCK THE{'\n'}FULL RIDE
          </AppText>

          <View style={{ alignSelf: 'flex-start', backgroundColor: palette.danger, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 10, gap: 2 }}>
            <AppText variant="bodyBold" style={{ color: palette.background, fontSize: 22, lineHeight: 26 }}>
              {offeringPackage?.packageType === 'ANNUAL' ? '₱590' : '₱59'}
            </AppText>
            <AppText variant="meta" style={{ color: palette.background }}>
              /{offeringPackage?.packageType === 'MONTHLY' ? 'month' : 'plan'}
            </AppText>
          </View>
          <AppText variant="meta">
            {isLoadingOffering
              ? 'Loading current Premium plan...'
              : offeringPackage?.product.introPrice
                ? 'Includes intro pricing or free trial · Cancel anytime'
                : 'Cancel anytime'}
          </AppText>

          <Pressable onPress={() => setShowReferralField((value) => !value)}>
            <AppText variant="meta" style={{ color: palette.text, textDecorationLine: 'underline' }}>
              Enter Referral Code
            </AppText>
          </Pressable>

          {showReferralField ? (
            <View style={{ gap: 10 }}>
              <TextInput
                value={referralCode}
                onChangeText={(value) => {
                  setReferralCode(value.toUpperCase());
                  setReferralError('');
                  setReferralSuccess('');
                }}
                placeholder="MARK450SR"
                placeholderTextColor={palette.textSecondary}
                autoCapitalize="characters"
                autoCorrect={false}
                selectionColor={palette.danger}
                style={{
                  minHeight: 50,
                  borderRadius: radius.md,
                  paddingHorizontal: 16,
                  borderWidth: 0.5,
                  borderColor: referralError ? palette.danger : palette.border,
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  color: palette.text,
                  fontFamily: 'DMSans_400Regular',
                  fontSize: 15,
                }}
              />
              <Button
                title={isValidatingReferral ? 'Checking...' : 'Validate Referral'}
                variant="secondary"
                disabled={isValidatingReferral}
                onPress={handleValidateReferral}
              />
              {referralError ? (
                <AppText variant="meta" style={{ color: palette.danger }}>
                  {referralError}
                </AppText>
              ) : null}
              {referralSuccess ? (
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <Ionicons name="checkmark-circle" size={16} color={palette.success} />
                  <AppText variant="meta" style={{ color: palette.success, flex: 1 }}>
                    {referralSuccess}
                  </AppText>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        <GlassCard style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0, gap: 14 }}>
          {features.map(([title, caption]) => (
            <View key={title} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
              <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                <Ionicons name="checkmark" size={12} color={palette.text} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <AppText variant="bodyBold" style={{ fontSize: 14 }}>
                  {title}
                </AppText>
                <AppText variant="meta" style={{ color: palette.textSecondary }}>
                  {caption}
                </AppText>
              </View>
            </View>
          ))}
        </GlassCard>
      </View>

      <Button
        title={
          isPurchasing
            ? 'Opening payment sheet…'
            : env.revenueCatEnabled
              ? session?.user.id
                ? 'Start 7-Day Free Trial →'
                : 'Create Account to Start Trial →'
              : 'Continue (Dev Build)'
        }
        disabled={isPurchasing || (env.revenueCatEnabled && Boolean(session?.user.id) && (isLoadingOffering || !offeringPackage))}
        onPress={handleStartTrial}
        style={{ backgroundColor: palette.danger, borderRadius: radius.pill, minHeight: 56, shadowColor: '#C64537', shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 4 } }}
      />
      {isLoadingOffering ? (
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="small" color={palette.textSecondary} />
          <AppText variant="meta" style={{ color: palette.textSecondary }}>
            Loading RevenueCat offering…
          </AppText>
        </View>
      ) : null}
      {purchaseError ? (
        <AppText variant="meta" style={{ color: palette.danger, textAlign: 'center' }}>
          {purchaseError}
        </AppText>
      ) : null}
      <Button
        title="Restore Purchase"
        variant="ghost"
        onPress={async () => {
          const result = await restorePremiumPurchases();
          if (result.success && result.hasPremium) {
            setPurchaseCompleted(true);
            setOnboardingStep(8);
            router.replace('/(public)/success' as any);
          } else if (!result.success) {
            setPurchaseError(result.reason);
          }
        }}
      />

      <AppText variant="meta" style={{ color: palette.textSecondary, textAlign: 'center', fontSize: 11 }}>
        By continuing you agree to the subscription and trial terms.
      </AppText>
    </View>
  );

  // Unified full-bleed layout for both onboarding and direct paywall entry points
  return (
    <AppScreen style={{ padding: 0 }} showWordmark={false}>
      <LinearGradient colors={['#060606', '#0A0A0A', '#0D0D0D']} style={{ position: 'absolute', inset: 0 }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <GlassCard style={{ flex: 1, borderRadius: 0, padding: 22, backgroundColor: 'transparent', borderWidth: 0 }}>
          <ScrollView
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            {body}
          </ScrollView>
        </GlassCard>
      </KeyboardAvoidingView>
    </AppScreen>
  );
}
