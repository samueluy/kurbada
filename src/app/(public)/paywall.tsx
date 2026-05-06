import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Alert, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { AppScrollScreen } from '@/components/ui/app-screen';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { ProgressDots } from '@/components/ui/progress-dots';
import { palette, radius } from '@/constants/theme';
import { env } from '@/lib/env';
import { purchasePremium, restorePremiumPurchases } from '@/services/revenuecat';
import { useAppStore } from '@/store/app-store';

const features = [
  ['Lean Angle Tracker', 'Weekend runs with live motorcycle telemetry.'],
  ['Emergency QR Lockscreen', 'Share the right info when every second matters.'],
  ['Shareable Ride Cards', 'Export polished ride summaries for social sharing.'],
  ['Maintenance Tracker', 'Keep service intervals and reminders in one place.'],
];

export default function PaywallScreen() {
  const completeOnboarding = useAppStore((state) => state.completeOnboarding);

  return (
    <AppScrollScreen contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
      <View style={{ gap: 18 }}>
        <ProgressDots total={6} current={5} />
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
                /buwan
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
          title={env.revenueCatEnabled ? 'Start Free Trial →' : 'RevenueCat Disabled for Dev Build'}
          onPress={async () => {
            if (!env.revenueCatEnabled) {
              completeOnboarding();
              router.replace('/(public)/auth/sign-in');
              return;
            }

            const result = await purchasePremium();
            if (!result.success) {
              Alert.alert('Not available yet', result.reason ?? 'Purchases are disabled for this build.');
              return;
            }
            completeOnboarding();
            router.replace('/');
          }}
        />
        <Button
          title="Restore Purchase"
          variant="ghost"
          onPress={async () => {
            const restored = await restorePremiumPurchases();
            if (restored) {
              completeOnboarding();
              router.replace('/');
            } else {
              Alert.alert('No purchases found', 'We could not restore an active premium entitlement.');
            }
          }}
        />
        <AppText variant="meta" style={{ color: palette.textSecondary }}>
          By continuing you agree to the current subscription and trial terms configured for Kurbada.
        </AppText>
      </View>
    </AppScrollScreen>
  );
}
