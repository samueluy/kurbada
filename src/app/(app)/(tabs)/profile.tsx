import { router } from 'expo-router';
import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { AppScrollScreen } from '@/components/ui/app-screen';
import { Button } from '@/components/ui/button';
import { FloatingField } from '@/components/ui/floating-field';
import { GlassCard } from '@/components/ui/glass-card';
import { KeyboardSheet } from '@/components/ui/keyboard-sheet';
import { ListRow } from '@/components/ui/list-row';
import { SectionHeader } from '@/components/ui/section-header';
import { palette } from '@/constants/theme';
import { EmergencyQRCard } from '@/features/profile/components/emergency-qr-card';
import { formatCurrencyPhp } from '@/lib/format';
import { useAuth } from '@/hooks/use-auth';
import { useBikes, useEmergencyInfo, useFuelLogs, useRides } from '@/hooks/use-kurbada-data';
import { useUserProfile } from '@/hooks/use-user-access';
import { useAppStore } from '@/store/app-store';
import { useState } from 'react';

export default function ProfileTabScreen() {
  const { session, signOut } = useAuth();
  const profile = useUserProfile(session?.user.id);
  const rides = useRides(session?.user.id);
  const fuelLogs = useFuelLogs(session?.user.id);
  const bikes = useBikes(session?.user.id);
  const emergency = useEmergencyInfo(session?.user.id);
  const customFuelPrice = useAppStore((state) => state.customFuelPricePerLiter);
  const setCustomFuelPrice = useAppStore((state) => state.setCustomFuelPricePerLiter);
  const resetForSignOut = useAppStore((state) => state.resetForSignOut);

  const [showFuelPrice, setShowFuelPrice] = useState(false);
  const [fuelPriceInput, setFuelPriceInput] = useState('');

  const totalDistance = (rides.data ?? []).reduce((sum, ride) => sum + ride.distance_km, 0);
  const totalFuel = (fuelLogs.data ?? []).reduce((sum, log) => sum + log.total_cost, 0);
  const memberSince = profile.data?.created_at
    ? new Date(profile.data.created_at).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    : 'May 1, 2026';
  const statValueColor = (value: number) => (value > 0 ? palette.text : palette.textTertiary);

  return (
    <>
    <AppScrollScreen>
      <View style={{ gap: 8 }}>
        <AppText variant="eyebrow">Profile</AppText>
        <AppText variant="screenTitle">Rider identity, kept tight.</AppText>
        <AppText variant="body">Your stats, emergency identity, and account details live here.</AppText>
      </View>

      <GlassCard style={{ alignItems: 'center', gap: 12, padding: 22 }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, overflow: 'hidden', backgroundColor: palette.surfaceMuted, alignItems: 'center', justifyContent: 'center' }}>
          <AppText variant="bodyBold" style={{ fontSize: 20 }}>{(profile.data?.display_name ?? 'KR').slice(0, 2).toUpperCase()}</AppText>
        </View>
        <AppText variant="title" style={{ fontSize: 22 }}>
          {profile.data?.display_name ?? 'Kurbada Rider'}
        </AppText>
        <AppText variant="meta">Member since {memberSince}</AppText>
      </GlassCard>

      <SectionHeader title="Your Stats" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <GlassCard style={{ width: '47%', padding: 14, borderRadius: 14 }}>
          <AppText variant="label">Rides</AppText>
          <AppText variant="cardMetric" style={{ color: statValueColor(rides.data?.length ?? 0) }}>{rides.data?.length ?? 0}</AppText>
        </GlassCard>
        <GlassCard style={{ width: '47%', padding: 14, borderRadius: 14 }}>
          <AppText variant="label">Distance</AppText>
          <AppText variant="cardMetric" style={{ color: statValueColor(totalDistance) }}>{totalDistance.toFixed(1)} km</AppText>
        </GlassCard>
        <GlassCard style={{ width: '47%', padding: 14, borderRadius: 14 }}>
          <AppText variant="label">Fuel Logged</AppText>
          <AppText variant="cardMetric" style={{ fontSize: 22, color: statValueColor(totalFuel) }}>{formatCurrencyPhp(totalFuel)}</AppText>
        </GlassCard>
        <GlassCard style={{ width: '47%', padding: 14, borderRadius: 14 }}>
          <AppText variant="label">Bikes</AppText>
          <AppText variant="cardMetric" style={{ color: statValueColor(bikes.data?.length ?? 0) }}>{bikes.data?.length ?? 0}</AppText>
        </GlassCard>
      </View>

      <SectionHeader title="Emergency Info QR" />
      <EmergencyQRCard emergency={emergency.data} onPress={() => router.push('/(app)/profile/emergency')} />

      <SectionHeader title="Settings" />
      <GlassCard style={{ padding: 18 }}>
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
          subtitle={profile.data?.subscription_status ?? 'inactive'}
          onPress={() => router.push('/(app)/profile/billing')}
        />
      </GlassCard>

      <Button title="Sign Out" variant="secondary" onPress={async () => { await signOut(); resetForSignOut(); router.replace('/'); }} />

      <View style={{ paddingVertical: 24 }}>
        <AppText variant="meta" style={{ fontSize: 11, opacity: 0.25, textAlign: 'center' }}>
          Privacy Policy · Terms of Service
        </AppText>
      </View>
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
    </>  );
}
