import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { AppScrollScreen } from '@/components/ui/app-screen';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { FloatingField } from '@/components/ui/floating-field';
import { GlassCard } from '@/components/ui/glass-card';
import { SectionHeader } from '@/components/ui/section-header';
import { BikeCard } from '@/features/garage/components/bike-card';
import { useAuth } from '@/hooks/use-auth';
import { useBikeMutations, useBikes } from '@/hooks/use-kurbada-data';

export default function GarageTabScreen() {
  const { session } = useAuth();
  const bikes = useBikes(session?.user.id);
  const { saveBike, deleteBike } = useBikeMutations(session?.user.id);
  const isSubmittingRef = useRef(false);
  const [showForm, setShowForm] = useState(false);
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [engineCc, setEngineCc] = useState('');

  return (
    <AppScrollScreen>
      <View style={{ gap: 8 }}>
        <AppText variant="eyebrow">Garage</AppText>
        <AppText variant="screenTitle">Your machines, not just a list.</AppText>
        <AppText variant="body">Keep your bike setup feeling like a collection.</AppText>
      </View>

      <SectionHeader title="My Garage" action={<Button title={showForm ? 'Close' : '+ Add'} variant="secondary" onPress={() => setShowForm((value) => !value)} style={{ minHeight: 40, borderRadius: 14 }} />} />

      {showForm ? (
        <GlassCard style={{ padding: 18, gap: 10 }}>
          <FloatingField label="Make" value={make} onChangeText={setMake} placeholder="Kawasaki" />
          <FloatingField label="Model" value={model} onChangeText={setModel} placeholder="Z400" />
          <FloatingField label="Year" value={year} onChangeText={setYear} placeholder="2023" keyboardType="number-pad" />
          <FloatingField label="Engine CC" value={engineCc} onChangeText={setEngineCc} placeholder="399" keyboardType="number-pad" />
          <Button
            title="Save Bike"
            onPress={async () => {
              if (isSubmittingRef.current) {
                return;
              }

              isSubmittingRef.current = true;
              try {
                await saveBike.mutateAsync({
                  id: '',
                  make,
                  model,
                  year: Number(year),
                  engine_cc: Number(engineCc),
                  current_odometer_km: 0,
                  category: 'naked',
                });
                setShowForm(false);
                setMake('');
                setModel('');
                setYear('');
                setEngineCc('');
              } finally {
                isSubmittingRef.current = false;
              }
            }}
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
      ) : (
        <GlassCard style={{ padding: 18 }}>
          <EmptyState icon="bicycle-outline" title="Add your first bike" body="Start your garage with one machine and maintenance tracking will unlock automatically." actionTitle="Add bike" onAction={() => setShowForm(true)} />
        </GlassCard>
      )}

    </AppScrollScreen>
  );
}
