import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { AppScrollScreen } from '@/components/ui/app-screen';
import { Button } from '@/components/ui/button';
import { FloatingField } from '@/components/ui/floating-field';
import { GlassCard } from '@/components/ui/glass-card';
import { ProgressDots } from '@/components/ui/progress-dots';
import { palette, radius } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useBikeMutations } from '@/hooks/use-kurbada-data';
import { useAppStore } from '@/store/app-store';
import type { Bike } from '@/types/domain';

const categories: Bike['category'][] = ['sport', 'naked', 'adventure', 'scooter'];

export default function BikeSetupScreen() {
  const params = useLocalSearchParams<{ flow?: string }>();
  const { session } = useAuth();
  const { saveBike } = useBikeMutations(session?.user.id);
  const completeBikeSetup = useAppStore((state) => state.completeBikeSetup);
  const [make, setMake] = useState('Kawasaki');
  const [model, setModel] = useState('Z400');
  const [year, setYear] = useState('2023');
  const [engineCc, setEngineCc] = useState('399');
  const [odometer, setOdometer] = useState('12840');
  const [category, setCategory] = useState<Bike['category']>('naked');
  const isOnboarding = params.flow === 'onboarding';

  return (
    <AppScrollScreen contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
      <GlassCard style={{ gap: 18, padding: 22 }}>
        {isOnboarding ? <ProgressDots total={6} current={3} /> : null}
        <View style={{ gap: 8 }}>
          {isOnboarding ? (
            <AppText variant="label" style={{ color: palette.textSecondary }}>
              Step 4 of 6
            </AppText>
          ) : null}
          <AppText variant="screenTitle" style={{ fontSize: 30 }}>
            What do you ride?
          </AppText>
          <AppText variant="meta" style={{ color: palette.textSecondary }}>
            Add your first bike now, or skip and come back from the Garage tab.
          </AppText>
        </View>

        <FloatingField label="Make" value={make} onChangeText={setMake} placeholder="Kawasaki" />
        <FloatingField label="Model" value={model} onChangeText={setModel} placeholder="Z400" />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <FloatingField label="Year" value={year} onChangeText={setYear} placeholder="2023" keyboardType="number-pad" containerStyle={{ flex: 1 }} />
          <FloatingField label="Engine CC" value={engineCc} onChangeText={setEngineCc} placeholder="399" keyboardType="number-pad" containerStyle={{ flex: 1 }} />
        </View>
        <FloatingField label="Odometer" value={odometer} onChangeText={setOdometer} placeholder="12840" keyboardType="number-pad" />

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {categories.map((item) => (
            <Pressable
              key={item}
              onPress={() => setCategory(item)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                borderRadius: radius.pill,
                borderWidth: category === item ? 0 : 1.5,
                borderColor: palette.border,
                backgroundColor: category === item ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.04)',
                paddingHorizontal: 12,
                paddingVertical: 10,
              }}>
              <MaterialCommunityIcons
                name={item === 'scooter' ? 'scooter' : 'motorbike'}
                size={16}
                color={category === item ? palette.text : palette.textSecondary}
              />
              <AppText variant="button" style={{ color: category === item ? palette.text : palette.textSecondary }}>
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </AppText>
            </Pressable>
          ))}
        </View>

        <Button
          title="Save & Continue →"
          onPress={async () => {
            await saveBike.mutateAsync({
              id: '',
              make,
              model,
              year: Number(year),
              engine_cc: Number(engineCc),
              current_odometer_km: Number(odometer),
              category,
            });
            completeBikeSetup();
            router.replace(isOnboarding ? '/(public)/emergency' : '/(app)/(tabs)/ride');
          }}
        />
        <Button
          title="Skip for now"
          variant="ghost"
          onPress={() => {
            completeBikeSetup();
            router.replace(isOnboarding ? '/(public)/emergency' : '/(app)/(tabs)/ride');
          }}
        />
      </GlassCard>
    </AppScrollScreen>
  );
}
