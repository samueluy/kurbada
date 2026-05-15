import { router } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, View } from 'react-native';

import { TabTransition } from '@/components/navigation/tab-transition';
import { AppText } from '@/components/ui/app-text';
import { AppScrollScreen } from '@/components/ui/app-screen';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { GlassCard } from '@/components/ui/glass-card';
import { SectionHeader } from '@/components/ui/section-header';
import { palette } from '@/constants/theme';
import { BikeCard } from '@/features/garage/components/bike-card';
import { BikeIdentityForm, BIKE_IDENTITY_EMPTY, resolveBikeIdentity, type BikeIdentityDraft } from '@/features/garage/components/bike-identity-form';
import { useAuth } from '@/hooks/use-auth';
import { useBikeMutations, useBikes } from '@/hooks/use-kurbada-data';
import { inferBikeCategory } from '@/lib/bike-models';

export default function GarageTabScreen() {
  const { session } = useAuth();
  const bikes = useBikes(session?.user.id);
  const { saveBikeSetup, deleteBike } = useBikeMutations(session?.user.id);
  const isSubmittingRef = useRef(false);
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<BikeIdentityDraft>(BIKE_IDENTITY_EMPTY);

  const { isValid, finalNickname, finalBrand, finalModel, finalYear, finalCc, finalOdometer } = useMemo(() => resolveBikeIdentity(draft), [draft]);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const refetch = (bikes as { refetch?: () => Promise<unknown> }).refetch;
      await refetch?.();
    } finally {
      setIsRefreshing(false);
    }
  }, [bikes]);

  const handleChange = (partial: Partial<BikeIdentityDraft>) => {
    setDraft((prev) => ({ ...prev, ...partial }));
  };

  const handleSave = async () => {
    if (isSubmittingRef.current) {
      return;
    }
    if (!isValid) {
      Alert.alert('Incomplete bike details', 'Please fill in brand, model, year, engine CC, and odometer before saving.');
      return;
    }

    isSubmittingRef.current = true;
    try {
      await saveBikeSetup.mutateAsync({
        make: finalBrand,
        model: finalModel,
        nickname: finalNickname || null,
        year: Number(finalYear),
        engine_cc: Number(finalCc),
        current_odometer_km: Number(finalOdometer),
        category: inferBikeCategory({ model: finalModel, cc: finalCc }),
      });
      setShowForm(false);
      setDraft(BIKE_IDENTITY_EMPTY);
    } catch (error) {
      Alert.alert('Could not save bike', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      isSubmittingRef.current = false;
    }
  };

  return (
    <TabTransition>
      <AppScrollScreen refreshing={isRefreshing} onRefresh={handleRefresh}>
        <View style={{ gap: 8 }}>
          <AppText variant="eyebrow">Garage</AppText>
          <AppText variant="screenTitle">Your bikes, your pride.</AppText>
          <AppText variant="body">          Add your bikes. Track maintenance and costs for each.</AppText>
        </View>

        <SectionHeader title="My Garage" action={<Button title={showForm ? 'Close' : '+ Add'} variant="secondary" onPress={() => setShowForm((value) => !value)} style={{ minHeight: 40, borderRadius: 14 }} />} />

        {showForm ? (
          <GlassCard style={{ padding: 18, gap: 10 }}>
            <BikeIdentityForm value={draft} onChange={handleChange} showNickname />
            <Button
              title="Save Bike"
              variant="secondary"
              disabled={!isValid}
              style={{ backgroundColor: palette.danger, borderColor: palette.danger }}
              onPress={handleSave}
            />
          </GlassCard>
        ) : null}

        {bikes.data?.length ? (
          bikes.data.map((bike) => (
            <BikeCard
              key={bike.id}
              bike={bike}
              onPress={() => router.push({ pathname: '/(app)/garage/[bikeId]', params: { bikeId: bike.id } })}
              onLongPress={() => {
                Alert.alert(`Delete ${bike.make} ${bike.model}?`, 'All maintenance records, rides, and fuel logs for this bike will also be removed.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => deleteBike.mutate(bike.id) },
                ]);
              }}
            />
          ))
        ) : !showForm ? (
          <GlassCard style={{ padding: 18 }}>
            <EmptyState icon="bicycle-outline" title="Add your first bike" body="Start your garage with one motorcycle and maintenance tracking will unlock automatically." actionTitle="Add Bike" onAction={() => setShowForm(true)} />
          </GlassCard>
        ) : null}
      </AppScrollScreen>
    </TabTransition>
  );
}
