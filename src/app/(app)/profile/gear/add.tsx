import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';

import { AppScrollScreen } from '@/components/ui/app-screen';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { FloatingField } from '@/components/ui/floating-field';
import { GlassCard } from '@/components/ui/glass-card';
import { palette, radius } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useBikes, useGearItems, useGearMutations } from '@/hooks/use-kurbada-data';
import { GEAR_CATEGORY_DEFAULTS, GEAR_CATEGORY_LABELS } from '@/lib/gear';
import type { GearCategory } from '@/types/domain';

const categories: GearCategory[] = [
  'helmet',
  'jacket',
  'gloves',
  'boots',
  'pants',
  'tire_front',
  'tire_rear',
  'chain',
  'battery',
  'other',
];

export default function AddGearScreen() {
  const { session } = useAuth();
  const params = useLocalSearchParams<{ gearId?: string }>();
  const gearId = Array.isArray(params.gearId) ? params.gearId[0] : params.gearId;
  const gear = useGearItems(session?.user.id);
  const bikes = useBikes(session?.user.id);
  const { saveGearItem } = useGearMutations(session?.user.id);

  const existing = useMemo(
    () => (gearId ? (gear.data ?? []).find((g) => g.id === gearId) : undefined),
    [gear.data, gearId],
  );

  const [name, setName] = useState(existing?.name ?? '');
  const [category, setCategory] = useState<GearCategory>(existing?.category ?? 'helmet');
  const [installDate, setInstallDate] = useState(existing?.install_date ?? new Date().toISOString().slice(0, 10));
  const [installOdo, setInstallOdo] = useState(
    existing?.install_odometer_km != null ? String(existing.install_odometer_km) : '',
  );
  const [lifetimeMonths, setLifetimeMonths] = useState(
    existing?.expected_lifetime_months != null
      ? String(existing.expected_lifetime_months)
      : String(GEAR_CATEGORY_DEFAULTS[existing?.category ?? 'helmet'].lifetimeMonths ?? ''),
  );
  const [lifetimeKm, setLifetimeKm] = useState(
    existing?.expected_lifetime_km != null
      ? String(existing.expected_lifetime_km)
      : String(GEAR_CATEGORY_DEFAULTS[existing?.category ?? 'helmet'].lifetimeKm ?? ''),
  );
  const [bikeId, setBikeId] = useState<string | null>(existing?.bike_id ?? null);
  const [busy, setBusy] = useState(false);

  const handleCategoryChange = (c: GearCategory) => {
    setCategory(c);
    // Apply category defaults if user hasn't manually edited yet
    if (!existing) {
      const defaults = GEAR_CATEGORY_DEFAULTS[c];
      setLifetimeMonths(defaults.lifetimeMonths ? String(defaults.lifetimeMonths) : '');
      setLifetimeKm(defaults.lifetimeKm ? String(defaults.lifetimeKm) : '');
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Give this gear item a short name.');
      return;
    }
    if (!installDate) {
      Alert.alert('Install date required', 'When did you start using this?');
      return;
    }

    const months = lifetimeMonths.trim() ? Number(lifetimeMonths) : null;
    const km = lifetimeKm.trim() ? Number(lifetimeKm) : null;
    const odo = installOdo.trim() ? Number(installOdo) : null;

    try {
      setBusy(true);
      await saveGearItem.mutateAsync({
        id: existing?.id,
        bike_id: bikeId,
        name: name.trim(),
        category,
        install_date: installDate,
        install_odometer_km: odo && Number.isFinite(odo) ? odo : null,
        expected_lifetime_months: months && Number.isFinite(months) ? months : null,
        expected_lifetime_km: km && Number.isFinite(km) ? km : null,
        notes: null,
        archived: false,
      });
      router.back();
    } catch (error) {
      Alert.alert('Save failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppScrollScreen showWordmark={false}>
      <View style={{ gap: 8 }}>
        <AppText variant="eyebrow">{existing ? 'Edit' : 'Add'} Gear</AppText>
        <AppText variant="screenTitle" style={{ fontSize: 26 }}>
          {existing ? existing.name : 'Track a new piece of gear'}
        </AppText>
        <AppText variant="body" style={{ color: palette.textSecondary }}>
          Category defaults reflect typical lifetimes — override if yours differ.
        </AppText>
      </View>

      <GlassCard style={{ padding: 18, gap: 12, borderRadius: radius.lg }}>
        <FloatingField label="Name" value={name} onChangeText={setName} placeholder="HJC i71, Michelin Pilot, etc." />

        <View style={{ gap: 6 }}>
          <AppText variant="label" style={{ color: palette.textSecondary, fontSize: 12 }}>
            Category
          </AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
            {categories.map((c) => {
              const active = category === c;
              return (
                <Pressable
                  key={c}
                  onPress={() => handleCategoryChange(c)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 999,
                    backgroundColor: active ? palette.text : 'rgba(255,255,255,0.06)',
                    borderWidth: 0.5,
                    borderColor: active ? palette.text : palette.border,
                  }}>
                  <AppText
                    variant="button"
                    style={{ fontSize: 12, color: active ? palette.background : palette.textSecondary }}>
                    {GEAR_CATEGORY_LABELS[c]}
                  </AppText>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <FloatingField
          label="Install date (YYYY-MM-DD)"
          value={installDate}
          onChangeText={setInstallDate}
          placeholder={new Date().toISOString().slice(0, 10)}
          autoCapitalize="none"
        />

        <FloatingField
          label="Install odometer (km, optional)"
          value={installOdo}
          onChangeText={setInstallOdo}
          placeholder="12840"
          keyboardType="numeric"
        />

        <FloatingField
          label="Expected lifetime (months, optional)"
          value={lifetimeMonths}
          onChangeText={setLifetimeMonths}
          placeholder="60"
          keyboardType="numeric"
        />

        <FloatingField
          label="Expected lifetime (km, optional)"
          value={lifetimeKm}
          onChangeText={setLifetimeKm}
          placeholder="10000"
          keyboardType="numeric"
        />

        {(bikes.data ?? []).length > 0 ? (
          <View style={{ gap: 6 }}>
            <AppText variant="label" style={{ color: palette.textSecondary, fontSize: 12 }}>
              Attach to bike (optional)
            </AppText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              <Pressable
                onPress={() => setBikeId(null)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 999,
                  backgroundColor: bikeId === null ? palette.text : 'rgba(255,255,255,0.06)',
                  borderWidth: 0.5,
                  borderColor: bikeId === null ? palette.text : palette.border,
                }}>
                <AppText
                  variant="button"
                  style={{ fontSize: 12, color: bikeId === null ? palette.background : palette.textSecondary }}>
                  None
                </AppText>
              </Pressable>
              {(bikes.data ?? []).map((b) => {
                const active = bikeId === b.id;
                return (
                  <Pressable
                    key={b.id}
                    onPress={() => setBikeId(b.id)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 999,
                      backgroundColor: active ? palette.text : 'rgba(255,255,255,0.06)',
                      borderWidth: 0.5,
                      borderColor: active ? palette.text : palette.border,
                    }}>
                    <AppText
                      variant="button"
                      style={{ fontSize: 12, color: active ? palette.background : palette.textSecondary }}>
                      {b.make} {b.model}
                    </AppText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}
      </GlassCard>

      <Button title={busy ? 'Saving...' : existing ? 'Save changes' : 'Add gear'} disabled={busy} onPress={handleSave} />
      <Button title="Cancel" variant="ghost" onPress={() => router.back()} />
    </AppScrollScreen>
  );
}
