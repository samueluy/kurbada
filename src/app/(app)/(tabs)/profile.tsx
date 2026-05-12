import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, Share, View } from 'react-native';

import { TabTransition } from '@/components/navigation/tab-transition';
import { AppText } from '@/components/ui/app-text';
import { AppScrollScreen } from '@/components/ui/app-screen';
import { Button } from '@/components/ui/button';
import { FloatingField } from '@/components/ui/floating-field';
import { GlassCard } from '@/components/ui/glass-card';
import { KeyboardSheet } from '@/components/ui/keyboard-sheet';
import { ListRow } from '@/components/ui/list-row';
import { SectionHeader } from '@/components/ui/section-header';
import { palette, radius } from '@/constants/theme';
import { EmergencyQRCard } from '@/features/profile/components/emergency-qr-card';
import { formatCurrencyPhp, formatSubscriptionStatusLabel } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/use-auth';
import { useBikes, useEmergencyInfo, useFuelLogs, useRides } from '@/hooks/use-kurbada-data';
import { useRevenueCatStatus } from '@/hooks/use-revenuecat-status';
import { useUserProfile } from '@/hooks/use-user-access';
import { useAppStore } from '@/store/app-store';

export default function ProfileTabScreen() {
  const { session, signOut } = useAuth();
  const profile = useUserProfile(session?.user.id);
  const rides = useRides(session?.user.id);
  const fuelLogs = useFuelLogs(session?.user.id);
  const bikes = useBikes(session?.user.id);
  const emergency = useEmergencyInfo(session?.user.id);
  const rcStatus = useRevenueCatStatus();
  const customFuelPrice = useAppStore((state) => state.customFuelPricePerLiter);
  const setCustomFuelPrice = useAppStore((state) => state.setCustomFuelPricePerLiter);
  const workModeEnabled = useAppStore((state) => state.workMode);

  const [showFuelPrice, setShowFuelPrice] = useState(false);
  const [fuelPriceInput, setFuelPriceInput] = useState('');
  const [showEditName, setShowEditName] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const totalDistance = useMemo(
    () => (rides.data ?? []).reduce((sum, ride) => sum + ride.distance_km, 0),
    [rides.data],
  );
  const totalFuel = useMemo(
    () => (fuelLogs.data ?? []).reduce((sum, log) => sum + log.total_cost, 0),
    [fuelLogs.data],
  );
  const memberSince = profile.data?.created_at
    ? new Date(profile.data.created_at).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    : 'May 1, 2026';
  const statValueColor = (value: number) => (value > 0 ? palette.text : palette.textTertiary);

  const appVersion = useMemo(
    () => (Constants.expoConfig?.version ? `v${Constants.expoConfig.version}` : ''),
    [],
  );

  const referralCode = profile.data?.referral_code ?? '';

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const refetches = [
        (profile as { refetch?: () => Promise<unknown> }).refetch,
        (rides as { refetch?: () => Promise<unknown> }).refetch,
        (fuelLogs as { refetch?: () => Promise<unknown> }).refetch,
        (bikes as { refetch?: () => Promise<unknown> }).refetch,
        (emergency as { refetch?: () => Promise<unknown> }).refetch,
      ].filter(Boolean) as (() => Promise<unknown>)[];
      await Promise.all(refetches.map((fn) => fn()));
    } finally {
      setIsRefreshing(false);
    }
  }, [profile, rides, fuelLogs, bikes, emergency]);

  const handleCopyReferral = useCallback(async () => {
    if (!referralCode) return;
    await Clipboard.setStringAsync(referralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 1600);
  }, [referralCode]);

  const handleShareReferral = useCallback(async () => {
    if (!referralCode) return;
    try {
      await Share.share({
        message: `Join me on Kurbada and use my code ${referralCode} at the paywall. https://kurbada.samueluy.com`,
      });
    } catch {
      // no-op
    }
  }, [referralCode]);

  const handleSaveDisplayName = useCallback(async () => {
    const trimmed = displayNameInput.trim();
    if (!trimmed) {
      Alert.alert('Name required', 'Please enter a display name.');
      return;
    }
    if (!supabase || !session?.user.id) {
      Alert.alert('Sign in required', 'You must be signed in to change your name.');
      return;
    }
    try {
      const client = supabase as any;
      const { error } = await client
        .from('profiles')
        .update({ display_name: trimmed })
        .eq('id', session.user.id);
      if (error) throw error;
      setShowEditName(false);
      const refetchFn = (profile as { refetch?: () => Promise<unknown> }).refetch;
      await refetchFn?.();
    } catch (error) {
      Alert.alert(
        'Could not update name',
        error instanceof Error ? error.message : 'Please try again.',
      );
    }
  }, [displayNameInput, profile, session?.user.id]);

  // Prefer live RevenueCat status; fall back to profile table value while loading
  const billingStatusLabel = rcStatus.isLoading
    ? formatSubscriptionStatusLabel(profile.data?.subscription_status ?? 'inactive')
    : formatSubscriptionStatusLabel(rcStatus.status);

  return (
    <TabTransition>
      <AppScrollScreen refreshing={isRefreshing} onRefresh={handleRefresh}>
        <View style={{ gap: 8 }}>
          <AppText variant="eyebrow">Profile</AppText>
          <AppText variant="screenTitle">Rider identity, kept tight.</AppText>
          <AppText variant="body">Your stats, emergency identity, and account details live here.</AppText>
        </View>

        <GlassCard style={{ alignItems: 'center', gap: 12, padding: 22 }}>
          <View style={{ width: 72, height: 72, borderRadius: 36, overflow: 'hidden', backgroundColor: palette.surfaceMuted, alignItems: 'center', justifyContent: 'center' }}>
            <AppText variant="bodyBold" style={{ fontSize: 20 }}>{(profile.data?.display_name ?? 'KR').slice(0, 2).toUpperCase()}</AppText>
          </View>
          <Pressable
            onPress={() => {
              setDisplayNameInput(profile.data?.display_name ?? '');
              setShowEditName(true);
            }}
            hitSlop={8}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <AppText variant="title" numberOfLines={1} ellipsizeMode="tail" style={{ fontSize: 22, textAlign: 'center' }}>
                {profile.data?.display_name ?? 'Kurbada Rider'}
              </AppText>
              <Ionicons name="pencil-outline" size={14} color={palette.textTertiary} />
            </View>
          </Pressable>
          <AppText variant="meta" numberOfLines={1}>Member since {memberSince}</AppText>
        </GlassCard>

        <SectionHeader title="Your Stats" />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          <GlassCard style={{ width: '47%', padding: 14, borderRadius: 14 }}>
            <AppText variant="label">Rides</AppText>
            <AppText variant="cardMetric" numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 22, color: statValueColor(rides.data?.length ?? 0) }}>{rides.data?.length ?? 0}</AppText>
          </GlassCard>
          <GlassCard style={{ width: '47%', padding: 16 }}>
            <AppText variant="label">Distance</AppText>
            <AppText variant="cardMetric" numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 22, color: statValueColor(totalDistance) }}>{totalDistance.toFixed(1)} km</AppText>
          </GlassCard>
          <GlassCard style={{ width: '47%', padding: 16 }}>
            <AppText variant="label">Fuel Logged</AppText>
            <AppText variant="cardMetric" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ fontSize: 22, color: statValueColor(totalFuel) }}>{formatCurrencyPhp(totalFuel)}</AppText>
          </GlassCard>
          <GlassCard style={{ width: '47%', padding: 16 }}>
            <AppText variant="label">Bikes</AppText>
            <AppText variant="cardMetric" numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 22, color: statValueColor(bikes.data?.length ?? 0) }}>{bikes.data?.length ?? 0}</AppText>
          </GlassCard>
        </View>

        {referralCode ? (
          <>
            <SectionHeader title="Referral Code" />
            <GlassCard style={{ padding: 18, gap: 12 }}>
              <AppText variant="meta" style={{ color: palette.textSecondary }}>
                Share your code. When a referred rider starts Premium, you get +1 month free.
              </AppText>
              <Pressable onPress={handleCopyReferral}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: 14,
                    paddingHorizontal: 16,
                    borderRadius: radius.md,
                    borderWidth: 0.5,
                    borderColor: palette.border,
                    backgroundColor: palette.surfaceMuted,
                  }}>
                  <AppText variant="mono" style={{ fontSize: 18, letterSpacing: 2 }}>
                    {referralCode}
                  </AppText>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons
                      name={copiedCode ? 'checkmark' : 'copy-outline'}
                      size={16}
                      color={copiedCode ? palette.success : palette.textSecondary}
                    />
                    <AppText
                      variant="label"
                      style={{ color: copiedCode ? palette.success : palette.textSecondary }}>
                      {copiedCode ? 'COPIED' : 'COPY'}
                    </AppText>
                  </View>
                </View>
              </Pressable>
              <Button
                title="Share Code"
                variant="secondary"
                onPress={handleShareReferral}
              />
              <Button
                title="View Weekly Leaderboard"
                variant="ghost"
                onPress={() => router.push('/(app)/board/leaderboard' as any)}
              />
            </GlassCard>
          </>
        ) : null}

        <SectionHeader title="Emergency Info QR" />
        <EmergencyQRCard emergency={emergency.data} onPress={() => router.push('/(app)/profile/emergency')} />

        <SectionHeader title="Settings" />
        <GlassCard style={{ padding: 18 }}>
          <ListRow
            icon="briefcase-outline"
            title="Work Mode"
            subtitle={workModeEnabled ? 'Earnings tracking on' : 'Track income from rides'}
            onPress={() => router.push('/(app)/profile/work-mode' as any)}
          />
          <ListRow
            icon="shirt-outline"
            title="Gear"
            subtitle="Helmet, jacket, tires — replacement tracking"
            onPress={() => router.push('/(app)/profile/gear' as any)}
          />
          <ListRow
            icon="notifications-outline"
            title="Notifications"
            subtitle="Crash alerts and reminders"
            onPress={() => router.push('/(app)/profile/notifications' as any)}
          />
          <ListRow
            icon="cash-outline"
            title="Fuel Price"
            subtitle={customFuelPrice ? `₱${customFuelPrice.toFixed(2)}/L` : 'Use fuel log average'}
            onPress={() => {
              setFuelPriceInput(customFuelPrice?.toString() ?? '');
              setShowFuelPrice(true);
            }}
          />
          <ListRow
            icon="card-outline"
            title="Billing"
            subtitle={billingStatusLabel}
            onPress={() => router.push('/(app)/profile/billing')}
          />
          <ListRow
            icon="shield-outline"
            title="Blocked users"
            subtitle="Hidden from your lobby"
            onPress={() => router.push('/(app)/board/blocked-users' as any)}
          />
          <ListRow
            icon="document-text-outline"
            title="Community Guidelines"
            subtitle="Lobby rules and safety"
            onPress={() => router.push('/(app)/board/community-guidelines' as any)}
          />
          <ListRow
            icon="trash-outline"
            title="Delete Account"
            subtitle="Permanently remove your rider profile"
            onPress={() => router.push('/(app)/profile/delete-account' as any)}
          />
        </GlassCard>

        <Button
          title="Sign Out"
          variant="secondary"
          onPress={() => {
            Alert.alert('Sign out?', 'You can sign back in anytime.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Sign Out',
                style: 'destructive',
                onPress: async () => {
                  await signOut();
                },
              },
            ]);
          }}
        />

        <View style={{ paddingVertical: 24, flexDirection: 'row', justifyContent: 'center', gap: 14 }}>
          <AppText
            variant="meta"
            onPress={() => Linking.openURL('https://kurbada.samueluy.com/policy').catch(() => undefined)}
            style={{ fontSize: 11, opacity: 0.45, textDecorationLine: 'underline' }}>
            Privacy Policy
          </AppText>
          <AppText variant="meta" style={{ fontSize: 11, opacity: 0.25 }}>·</AppText>
          <AppText
            variant="meta"
            onPress={() => Linking.openURL('https://kurbada.samueluy.com/terms').catch(() => undefined)}
            style={{ fontSize: 11, opacity: 0.45, textDecorationLine: 'underline' }}>
            Terms of Service
          </AppText>
        </View>

        {appVersion ? (
          <View style={{ paddingTop: 8, alignItems: 'center' }}>
            <AppText variant="meta" style={{ fontSize: 10, opacity: 0.35 }}>
              Kurbada {appVersion}
            </AppText>
          </View>
        ) : null}
      </AppScrollScreen>

      <KeyboardSheet
        visible={showFuelPrice}
        onClose={() => setShowFuelPrice(false)}
        title="Fuel Price per Liter"
        subtitle="Set a custom fuel price, or leave it blank to keep using your latest fuel log average.">
        <FloatingField
          label="PRICE PER LITER (PHP)"
          value={fuelPriceInput}
          onChangeText={setFuelPriceInput}
          placeholder="65.00"
          keyboardType="decimal-pad"
        />
        <AppText variant="meta" style={{ color: palette.textTertiary, fontSize: 11 }}>
          Defaults to your latest fuel log price if left blank.
        </AppText>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Button
              title="Clear"
              variant="ghost"
              onPress={() => {
                setCustomFuelPrice(null);
                setShowFuelPrice(false);
              }}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              title="Save"
              onPress={() => {
                const value = parseFloat(fuelPriceInput);
                if (fuelPriceInput.trim() && !isNaN(value) && value > 0) {
                  setCustomFuelPrice(value);
                } else {
                  setCustomFuelPrice(null);
                }
                setShowFuelPrice(false);
              }}
              style={{ backgroundColor: '#C0392B', borderRadius: 13, minHeight: 48 }}
            />
          </View>
        </View>
      </KeyboardSheet>

      <KeyboardSheet
        visible={showEditName}
        onClose={() => setShowEditName(false)}
        title="Edit display name"
        subtitle="This is shown on shared ride cards, the leaderboard, and lobby posts.">
        <FloatingField
          label="DISPLAY NAME"
          value={displayNameInput}
          onChangeText={setDisplayNameInput}
          placeholder="Kurbada Rider"
        />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Button title="Cancel" variant="ghost" onPress={() => setShowEditName(false)} />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              title="Save"
              onPress={handleSaveDisplayName}
              style={{ backgroundColor: '#C0392B', borderRadius: 13, minHeight: 48 }}
            />
          </View>
        </View>
      </KeyboardSheet>
    </TabTransition>
  );
}
