import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Platform, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { AppScrollScreen } from '@/components/ui/app-screen';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { palette, radius } from '@/constants/theme';
import { env } from '@/lib/env';
import { useAppStore } from '@/store/app-store';

const features = [
  ['Lean Angle Tracker', 'Weekend runs with live motorcycle telemetry.'],
  ['Emergency QR Lockscreen', 'Share the right info when every second matters.'],
  ['Shareable Ride Cards', 'Export polished ride summaries for social sharing.'],
  ['Maintenance Tracker', 'Keep service intervals and reminders in one place.'],
];

function getPurchases() {
  if (Platform.OS === 'web') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('react-native-purchases') as typeof import('react-native-purchases');
  } catch {
    return null;
  }
}

export default function PaywallScreen() {
  const setOnboardingStep = useAppStore((state) => state.setOnboardingStep);
  const setPurchaseCompleted = useAppStore((state) => state.setPurchaseCompleted);

  const handleRevenuCatPaywall = async () => {
    const purchases = getPurchases();
    if (!purchases || !env.revenueCatEnabled) {
      // Fallback: show custom UI below
      return false;
    }

    try {
      const rc = purchases.default as any;
      const result = await rc.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: 'premium',
      });

      if (result === rc.PURCHASE_RESULT?.PURCHASED) {
        setPurchaseCompleted(true);
        setOnboardingStep(7);
        router.replace('/(public)/success' as any);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const handleStartTrial = async () => {
    if (!env.revenueCatEnabled) {
      // Dev bypass: simulate successful purchase
      setPurchaseCompleted(true);
      setOnboardingStep(7);
      router.replace('/(public)/success' as any);
      return;
    }

    const purchases = getPurchases();
    if (!purchases) return;

    try {
      await handleRevenuCatPaywall();
    } catch {
      // Fall through to custom UI if RC paywall fails
    }
  };

  return (
    <AppScrollScreen contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
      <View style={{ gap: 18 }}>
        <AppText variant="label" style={{ color: palette.textSecondary, textAlign: 'center' }}>
          Step 6 of 7
        </AppText>
        <View style={{ gap: 0 }}>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: 20, gap: 12 }}>
            <AppText variant="label" style={{ color: palette.textSecondary }}>
              Kurbada Premium
            </AppText>
            <AppText variant="screenTitle" style={{ fontSize: 36, lineHeight: 38 }}>
              UNLOCK THE{'\n'}FULL RIDE
            </AppText>

            <View style={{ alignSelf: 'flex-start', backgroundColor: palette.danger, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 10, gap: 2 }}>
              <AppText variant="bodyBold" style={{ color: palette.background, fontSize: 24 }}>
                ₱59
              </AppText>
              <AppText variant="meta" style={{ color: palette.background }}>
                /month
              </AppText>
            </View>
            <AppText variant="meta">
              7-day free trial · Cancel anytime
            </AppText>
          </View>

          <GlassCard style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0, gap: 14 }}>
            {features.map(([title, caption]) => (
              <View key={title} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
                <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                  <Ionicons name="checkmark" size={12} color={palette.text} />
                </View>
                <View style={{ flex: 1 }}>
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
          title={env.revenueCatEnabled ? 'Start 7-Day Free Trial →' : 'Continue (Dev Build)'}
          onPress={handleStartTrial}
          style={{ backgroundColor: palette.danger, borderRadius: radius.pill, minHeight: 56, shadowColor: '#C64537', shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 4 } }}
        />
        <Button
          title="Restore Purchase"
          variant="ghost"
          onPress={async () => {
            const purchases = getPurchases();
            if (!purchases) return;
            try {
              await purchases.default.restorePurchases();
              setPurchaseCompleted(true);
              setOnboardingStep(7);
              router.replace('/(public)/success' as any);
            } catch {
              // ignore
            }
          }}
        />

        <AppText variant="meta" style={{ color: palette.textSecondary, textAlign: 'center', fontSize: 11 }}>
          By continuing you agree to the subscription and trial terms.
        </AppText>
      </View>
    </AppScrollScreen>
  );
}
