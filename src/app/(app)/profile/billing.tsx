import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { AppScrollScreen } from '@/components/ui/app-screen';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { SectionHeader } from '@/components/ui/section-header';
import { palette } from '@/constants/theme';
import { formatSubscriptionStatusLabel } from '@/lib/format';
import { useAuth } from '@/hooks/use-auth';
import { useUserProfile } from '@/hooks/use-user-access';
import {
  getRevenueCatSubscriptionSummary,
  openNativeSubscriptionManagement,
  restorePremiumPurchases,
} from '@/services/revenuecat';

export default function BillingScreen() {
  const { session } = useAuth();
  const profile = useUserProfile(session?.user.id);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [billingError, setBillingError] = useState('');
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof getRevenueCatSubscriptionSummary>> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadSummary = async () => {
      setLoading(true);
      setBillingError('');

      try {
        const nextSummary = await getRevenueCatSubscriptionSummary();
        if (!cancelled) {
          setSummary(nextSummary);
        }
      } catch (error) {
        if (!cancelled) {
          setBillingError(error instanceof Error ? error.message : 'Unable to load subscription status.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadSummary();
    return () => {
      cancelled = true;
    };
  }, []);

  const expiryLabel = useMemo(() => {
    const expiry = summary?.expirationDate ?? profile.data?.subscription_expires_at;
    if (!expiry) {
      return 'No renewal date on file';
    }

    return new Date(expiry).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, [profile.data?.subscription_expires_at, summary?.expirationDate]);

  return (
    <AppScrollScreen>
      <View style={{ gap: 8 }}>
        <AppText variant="eyebrow">Billing</AppText>
        <AppText variant="screenTitle">Manage Premium cleanly.</AppText>
        <AppText variant="body">Check your current access, restore purchases, or jump straight to your store subscription controls.</AppText>
      </View>

      <GlassCard style={{ padding: 20, gap: 14 }}>
        {loading ? (
          <View style={{ alignItems: 'center', gap: 10, paddingVertical: 16 }}>
            <ActivityIndicator color={palette.text} />
            <AppText variant="meta" style={{ color: palette.textSecondary }}>
              Loading RevenueCat status…
            </AppText>
          </View>
        ) : (
          <>
            <View style={{ gap: 4 }}>
              <AppText variant="label" style={{ color: palette.textSecondary }}>
                CURRENT STATUS
              </AppText>
              <AppText variant="title" style={{ fontSize: 24 }}>
                {formatSubscriptionStatusLabel(summary?.status ?? profile.data?.subscription_status ?? 'inactive')}
              </AppText>
            </View>

            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 16 }}>
                <AppText variant="meta" style={{ color: palette.textTertiary }}>Entitlement</AppText>
                <AppText variant="meta" style={{ color: palette.textSecondary }}>
                  {summary?.hasPremium ? 'premium' : 'none'}
                </AppText>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 16 }}>
                <AppText variant="meta" style={{ color: palette.textTertiary }}>Renewal / expiry</AppText>
                <AppText variant="meta" style={{ color: palette.textSecondary, textAlign: 'right' }}>
                  {expiryLabel}
                </AppText>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 16 }}>
                <AppText variant="meta" style={{ color: palette.textTertiary }}>Will renew</AppText>
                <AppText variant="meta" style={{ color: palette.textSecondary }}>
                  {summary?.willRenew ? 'Yes' : 'No'}
                </AppText>
              </View>
            </View>
          </>
        )}
      </GlassCard>

      <SectionHeader title="Actions" />
      <GlassCard style={{ padding: 18, gap: 12 }}>
        <Button
          title={busy ? 'Restoring…' : 'Restore Purchases'}
          disabled={busy}
          onPress={async () => {
            setBusy(true);
            setBillingError('');
            const result = await restorePremiumPurchases();
            if (!result.success) {
              setBillingError(result.reason);
            } else {
              const refreshed = await getRevenueCatSubscriptionSummary();
              setSummary(refreshed);
            }
            setBusy(false);
          }}
        />
        <Button
          title="Manage Subscription"
          variant="secondary"
          onPress={() => {
            void openNativeSubscriptionManagement().catch((error) => {
              setBillingError(error instanceof Error ? error.message : 'Could not open the subscription manager.');
            });
          }}
        />
        <Button title="Back to Profile" variant="ghost" onPress={() => router.back()} />
      </GlassCard>

      {billingError ? (
        <AppText variant="meta" style={{ color: palette.danger, textAlign: 'center' }}>
          {billingError}
        </AppText>
      ) : null}
    </AppScrollScreen>
  );
}
