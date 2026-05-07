import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, Share, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { AppScrollScreen } from '@/components/ui/app-screen';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { FloatingField } from '@/components/ui/floating-field';
import { GlassCard } from '@/components/ui/glass-card';
import { SectionHeader } from '@/components/ui/section-header';
import { BikeCard } from '@/features/garage/components/bike-card';
import { useAuth } from '@/hooks/use-auth';
import { useBikeMutations, useBikes, useProfileMutations } from '@/hooks/use-kurbada-data';
import { useUserProfile } from '@/hooks/use-user-access';

export default function GarageTabScreen() {
  const { session } = useAuth();
  const profile = useUserProfile(session?.user.id);
  const bikes = useBikes(session?.user.id);
  const { saveBike, deleteBike } = useBikeMutations(session?.user.id);
  const { updateReferralCode } = useProfileMutations(session?.user.id);
  const isSubmittingRef = useRef(false);
  const inviteSheetRef = useRef<BottomSheetModal>(null);
  const [showForm, setShowForm] = useState(false);
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [engineCc, setEngineCc] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  useEffect(() => {
    setInviteCode(profile.data?.referral_code ?? '');
  }, [profile.data?.referral_code]);

  const inviteMessage = useMemo(
    () =>
      `Tracked my last ride with Kurbada. Use my code ${profile.data?.referral_code ?? inviteCode} when you join and I get 1 month free.`,
    [inviteCode, profile.data?.referral_code],
  );

  return (
    <AppScrollScreen>
      <View style={{ gap: 8 }}>
        <AppText variant="eyebrow">Garage</AppText>
        <AppText variant="screenTitle">Your machines, not just a list.</AppText>
        <AppText variant="body">Keep your bike setup feeling like a collection.</AppText>
      </View>

      <Pressable onPress={() => inviteSheetRef.current?.present()}>
        <GlassCard style={{ padding: 18, gap: 10 }}>
          <AppText variant="label">Referral rewards</AppText>
          <AppText variant="title" style={{ fontSize: 18 }}>
            Invite a rider, get 1 month free.
          </AppText>
          <AppText variant="meta">
            Stack it forever. Your code: {profile.data?.referral_code ?? 'Loading...'}
          </AppText>
        </GlassCard>
      </Pressable>

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

      <BottomSheetModal
        ref={inviteSheetRef}
        snapPoints={['60%']}
        backgroundStyle={{ backgroundColor: '#181818' }}
        handleIndicatorStyle={{ backgroundColor: 'rgba(255,255,255,0.25)' }}>
        <BottomSheetView style={{ paddingHorizontal: 20, paddingBottom: 32, gap: 14 }}>
          <View style={{ gap: 6 }}>
            <AppText variant="title" style={{ fontSize: 20 }}>
              Invite a rider
            </AppText>
            <AppText variant="meta">
              Share your code, earn 1 month of Premium when their first trial or subscription starts.
            </AppText>
          </View>

          <GlassCard style={{ padding: 16, gap: 8 }}>
            <AppText variant="label">Your code</AppText>
            <AppText variant="cardMetric" style={{ fontSize: 32 }}>
              {(profile.data?.referral_code ?? inviteCode) || '...'}
            </AppText>
          </GlassCard>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button
              title="Copy"
              variant="secondary"
              style={{ flex: 1 }}
              onPress={async () => {
                const code = profile.data?.referral_code ?? inviteCode;
                if (!code) {
                  return;
                }
                await Clipboard.setStringAsync(code);
                Alert.alert('Copied', `${code} is ready to share.`);
              }}
            />
            <Button
              title="Share"
              variant="secondary"
              style={{ flex: 1 }}
              onPress={async () => {
                await Share.share({ message: inviteMessage });
              }}
            />
          </View>

          <FloatingField
            label="Edit referral code"
            value={inviteCode}
            onChangeText={setInviteCode}
            placeholder="MARK450SR"
            autoCapitalize="characters"
            autoCorrect={false}
          />

          <Button
            title={updateReferralCode.isPending ? 'Saving...' : 'Save Code'}
            disabled={updateReferralCode.isPending}
            onPress={async () => {
              try {
                await updateReferralCode.mutateAsync(inviteCode);
                inviteSheetRef.current?.dismiss();
              } catch (error) {
                Alert.alert('Unable to save code', error instanceof Error ? error.message : 'Please try again.');
              }
            }}
          />
        </BottomSheetView>
      </BottomSheetModal>
    </AppScrollScreen>
  );
}
