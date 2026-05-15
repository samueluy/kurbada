import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, InteractionManager, Pressable, ScrollView, View } from 'react-native';
import ViewShot from 'react-native-view-shot';

import { RouteMapPreview } from '@/components/ride/route-map-preview';
import { IgStoryCanvas } from '@/components/ride/ig-story-canvas';
import { AppText } from '@/components/ui/app-text';
import { AppScrollScreen } from '@/components/ui/app-screen';
import { Button } from '@/components/ui/button';
import { FloatingField } from '@/components/ui/floating-field';
import { GlassCard } from '@/components/ui/glass-card';
import { SectionHeader } from '@/components/ui/section-header';
import { StatCard } from '@/components/ui/stat-card';
import { formatCurrencyPhp, formatDuration } from '@/lib/format';
import { useAuth } from '@/hooks/use-auth';
import { useEarningsMutations, useFuelLogs, useRideDetails, useRideMutations } from '@/hooks/use-kurbada-data';
import { palette, radius } from '@/constants/theme';
import { rideStoryTemplates, type RideStoryTemplateId } from '@/lib/ride-story';
import { MoodPicker } from '@/features/ride/components/mood-picker';
import { triggerLightHaptic, triggerSuccessHaptic, triggerWarningHaptic } from '@/lib/haptics';
import { useAppStore, type PlatformTag } from '@/store/app-store';
import { useRideShareStore } from '@/store/ride-share-store';
import type { RideMood } from '@/types/domain';

const platformLabels: Record<PlatformTag, string> = {
  grab: 'Grab',
  lalamove: 'Lalamove',
  foodpanda: 'FoodPanda',
  moveit: 'MoveIt',
  joyride: 'Joyride',
  other: 'Other',
};

export default function RideSummaryScreen() {
  const params = useLocalSearchParams<{ rideId?: string }>();
  const { session } = useAuth();
  const fuelLogs = useFuelLogs(session?.user.id);
  const rideQuery = useRideDetails(params.rideId, session?.user.id);
  const ride = rideQuery.data;
  const latestFuelPrice = useMemo(() => {
    const logs = fuelLogs.data ?? [];
    return logs[0]?.price_per_liter ?? 65;
  }, [fuelLogs.data]);
  const workMode = useAppStore((s) => s.workMode);

  const totalSeconds = ride?.started_at && ride.ended_at
    ? Math.round((new Date(ride.ended_at).getTime() - new Date(ride.started_at).getTime()) / 1000)
    : 0;
  const [mood, setMood] = useState<RideMood | null>(ride?.mood ?? null);
  const [moodSaved, setMoodSaved] = useState(false);
  const [earningsSaved, setEarningsSaved] = useState(false);
  const [amountInput, setAmountInput] = useState('');
  const [platform, setPlatform] = useState<PlatformTag>('grab');
  const { saveEarnings } = useEarningsMutations(session?.user.id);
  const { updateRideMood, deleteRide } = useRideMutations(session?.user.id);
  const storyShotRef = useRef<any>(null);
  const draft = useRideShareStore((state) => state.draft);
  const initializeDraft = useRideShareStore((state) => state.initializeDraft);
  const updateDraft = useRideShareStore((state) => state.updateDraft);
  const clearPhoto = useRideShareStore((state) => state.clearPhoto);

  useEffect(() => {
    setMood(ride?.mood ?? null);
  }, [ride?.mood]);

  useEffect(() => {
    if (ride?.id) {
      initializeDraft(ride.id);
    }
  }, [initializeDraft, ride?.id]);

  const handleSaveMood = async (next: RideMood) => {
    if (!ride) return;
    triggerLightHaptic();
    setMood(next);
    try {
      await updateRideMood.mutateAsync({ rideId: ride.id, mood: next });
      triggerSuccessHaptic();
      setMoodSaved(true);
    } catch {
      // ignore
    }
  };

  const handleSaveEarnings = async () => {
    if (!ride || !session?.user.id) return;
    const amount = Number(amountInput);
    if (!Number.isFinite(amount) || amount <= 0) { Alert.alert('Invalid amount', 'Enter a valid amount.'); return; }
    try {
      await saveEarnings.mutateAsync({ user_id: session.user.id, ride_id: ride.id, bike_id: ride.bike_id, earned_at: ride.ended_at.slice(0, 10), amount, platform, notes: null });
      triggerSuccessHaptic();
      setEarningsSaved(true);
    } catch (error) { Alert.alert('Save failed', error instanceof Error ? error.message : 'Please try again.'); }
  };

  const pickStoryPhoto = async () => {
    try {
      const pickerResult = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
      if (pickerResult.canceled || !pickerResult.assets?.length) return;
      triggerSuccessHaptic();
      updateDraft({
        photoUri: pickerResult.assets[0].uri,
        photoScale: 1.3,
        photoOffsetX: 0,
        photoOffsetY: -40,
      });
      if (ride?.id) {
        router.push({ pathname: '/(app)/ride/share-editor' as any, params: { rideId: ride.id } });
      }
    } catch (error) { Alert.alert('Photo picker failed', error instanceof Error ? error.message : 'Could not open photo library.'); }
  };

  const captureAndShare = async () => {
    try {
      const uri = await storyShotRef.current?.capture?.();
      if (!uri) throw new Error('Could not capture the story card.');
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share ride image' });
    } catch (error) { Alert.alert('Export failed', error instanceof Error ? error.message : 'Please try again.'); }
  };

  const handleShareToStories = async () => {
    if (!draft.photoUri) { await pickStoryPhoto(); return; }
    InteractionManager.runAfterInteractions(() => { void captureAndShare(); });
  };
  const estimatedFuelCost = (ride?.fuel_used_liters ?? 0) * (latestFuelPrice ?? 65);

  if (rideQuery.isLoading && !ride) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.background }}>
        <AppScrollScreen>
          <GlassCard style={{ gap: 12, padding: 20 }}>
            <AppText variant="label">Loading ride</AppText>
            <AppText variant="title">Pulling up your ride summary…</AppText>
            <AppText variant="meta" style={{ color: palette.textSecondary }}>
              We&apos;re loading the route, stats, and share card for this ride.
            </AppText>
          </GlassCard>
        </AppScrollScreen>
      </View>
    );
  }

  if (rideQuery.error) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.background }}>
        <AppScrollScreen>
          <GlassCard style={{ gap: 12, padding: 20 }}>
            <AppText variant="label">Ride unavailable</AppText>
            <AppText variant="title">We couldn&apos;t load that ride.</AppText>
            <AppText variant="meta" style={{ color: palette.textSecondary }}>
              {rideQuery.error instanceof Error ? rideQuery.error.message : 'Please try again from your ride feed.'}
            </AppText>
            <Button title="Back to rides" variant="secondary" onPress={() => router.replace('/(app)/(tabs)/ride')} />
          </GlassCard>
        </AppScrollScreen>
      </View>
    );
  }

  if (!ride) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.background }}>
        <AppScrollScreen>
          <GlassCard style={{ gap: 12, padding: 20 }}>
            <AppText variant="label">Ride not found</AppText>
            <AppText variant="title">This ride is no longer available.</AppText>
            <AppText variant="meta" style={{ color: palette.textSecondary }}>
              No saved ride found.
            </AppText>
            <Button title="Back to rides" variant="secondary" onPress={() => router.replace('/(app)/(tabs)/ride')} />
          </GlassCard>
        </AppScrollScreen>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: palette.background }}>
      <AppScrollScreen>
        <GlassCard style={{ gap: 12, padding: 20 }}>
          <AppText variant="label">Ride saved</AppText>
          <AppText variant="heroMetric" numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 48, color: palette.text }}>
            {ride.distance_km.toFixed(1)} km
          </AppText>
        </GlassCard>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          <StatCard label="Top Speed" value={ride.max_speed_kmh.toFixed(0)} unit="km/h" />
          <StatCard label="Avg Speed" value={ride.avg_speed_kmh.toFixed(0)} unit="km/h" />
          <StatCard label="Total Time" value={formatDuration(totalSeconds)} />
          {ride.elevation_gain_m != null && ride.elevation_gain_m > 0 ? (
            <StatCard label="Elevation" value={Math.round(ride.elevation_gain_m).toString()} unit="m" />
          ) : null}
        </View>

        <GlassCard style={{ padding: 18, gap: 10, borderRadius: radius.lg }}>
          <AppText variant="eyebrow">HOW WAS THE RIDE?</AppText>
          <AppText variant="meta" style={{ color: palette.textSecondary }}>
            A quick tag so you can find it later.
          </AppText>
          <MoodPicker value={mood ?? ride.mood ?? null} onChange={handleSaveMood} />
          {moodSaved ? (
            <AppText variant="meta" style={{ color: palette.success }}>
              ✓ Saved
            </AppText>
          ) : null}
        </GlassCard>

        <View style={{ height: 260 }}>
          <RouteMapPreview
            routeGeoJson={ride.route_geojson}
            lineColor="#E63946"
            routeBounds={ride.route_bounds}
          />
        </View>

        {workMode && !earningsSaved ? (
          <GlassCard style={{ padding: 18, gap: 12, borderRadius: radius.lg, borderColor: palette.success, borderWidth: 0.5 }}>
            <View style={{ gap: 4 }}>
              <AppText variant="eyebrow" style={{ color: palette.success }}>LOG EARNINGS</AppText>
              <AppText variant="bodyBold">How much did you earn on this ride?</AppText>
              <AppText variant="meta" style={{ color: palette.textSecondary }}>
                Fuel cost estimate: {formatCurrencyPhp(estimatedFuelCost)}. Net = earnings − fuel.
              </AppText>
            </View>
            <FloatingField
              label="AMOUNT (PHP)"
              value={amountInput}
              onChangeText={setAmountInput}
              placeholder="0.00"
              keyboardType="decimal-pad"
            />
            <View style={{ gap: 6 }}>
              <AppText variant="label" style={{ color: palette.textSecondary, fontSize: 12 }}>Platform</AppText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                {(Object.keys(platformLabels) as PlatformTag[]).map((p) => (
                  <Pressable
                    key={p}
                    onPress={() => setPlatform(p)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 999,
                      backgroundColor: platform === p ? palette.text : 'rgba(255,255,255,0.06)',
                      borderWidth: 0.5,
                      borderColor: platform === p ? palette.text : palette.border,
                    }}>
                    <AppText
                      variant="button"
                      style={{ fontSize: 12, color: platform === p ? palette.background : palette.textSecondary }}>
                      {platformLabels[p]}
                    </AppText>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
            <Button title="Save Earnings" onPress={handleSaveEarnings} style={{ backgroundColor: palette.success }} />
            <Button title="Skip" variant="ghost" onPress={() => setEarningsSaved(true)} />
          </GlassCard>
        ) : null}

        {earningsSaved ? (
          <GlassCard style={{ padding: 14, borderColor: palette.success, borderWidth: 0.5, borderRadius: radius.md }}>
            <AppText variant="meta" style={{ color: palette.success }}>✓ Earnings saved for this ride.</AppText>
          </GlassCard>
        ) : null}

        <SectionHeader title="Share" />

        <GlassCard style={{ gap: 16, padding: 16 }}>
          <View style={{ gap: 6 }}>
            <AppText variant="meta" style={{ color: palette.textSecondary }}>
              Pick a gallery photo, switch between templates, then export straight from your phone. Nothing gets uploaded.
            </AppText>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {rideStoryTemplates.map((template) => {
              const active = draft.templateId === template.id;
              return (
                <Button
                  key={template.id}
                  title={template.label}
                  variant={active ? 'primary' : 'secondary'}
                  onPress={() => {
                    triggerLightHaptic();
                    updateDraft({ templateId: template.id as RideStoryTemplateId });
                  }}
                  style={{
                    minHeight: 40,
                    paddingHorizontal: 14,
                    borderRadius: radius.pill,
                    backgroundColor: active ? palette.danger : palette.surfaceStrong,
                  }}
                />
              );
            })}
          </ScrollView>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button
              title="White Text"
              variant={draft.textTone === 'light' ? 'primary' : 'secondary'}
              onPress={() => {
                triggerLightHaptic();
                updateDraft({ textTone: 'light' });
              }}
              style={{ flex: 1, minHeight: 40, borderRadius: radius.pill }}
            />
            <Button
              title="Black Text"
              variant={draft.textTone === 'dark' ? 'primary' : 'secondary'}
              onPress={() => {
                triggerLightHaptic();
                updateDraft({ textTone: 'dark' });
              }}
              style={{ flex: 1, minHeight: 40, borderRadius: radius.pill }}
            />
          </View>

          <View style={{ alignItems: 'center' }}>
            <IgStoryCanvas
              ride={ride}
              photoUri={draft.photoUri}
              templateId={draft.templateId}
              fuelPricePerLiter={latestFuelPrice}
              width={240}
              photoScale={draft.photoScale}
              photoOffsetX={draft.photoOffsetX}
              photoOffsetY={draft.photoOffsetY}
              overlayScale={draft.overlayScale}
              overlayOffsetX={draft.overlayOffsetX}
              overlayOffsetY={draft.overlayOffsetY}
              textTone={draft.textTone}
            />
          </View>

          <View style={{ gap: 10 }}>
            <Button
              title="Choose Photo"
              variant="secondary"
              onPress={pickStoryPhoto}
            />
            {draft.photoUri ? (
              <Button
                title="Adjust"
                variant="secondary"
                onPress={() => {
                  triggerLightHaptic();
                  updateDraft({ shareMode: 'story' });
                  router.push({ pathname: '/(app)/ride/share-editor' as any, params: { rideId: ride.id } });
                }}
              />
            ) : null}
            {draft.photoUri ? (
              <Button
                title="Use Route Background Instead"
                variant="ghost"
                onPress={() => {
                  triggerLightHaptic();
                  clearPhoto();
                }}
              />
            ) : null}
            <Button
              title="Share Story"
              onPress={handleShareToStories}
              style={{ backgroundColor: palette.danger }}
            />
            <Button
              title="Export Route Video"
              variant="secondary"
              onPress={() => {
                triggerLightHaptic();
                updateDraft({ shareMode: 'replay' });
                router.push({ pathname: '/(app)/ride/share-editor' as any, params: { rideId: ride.id } });
              }}
            />
          </View>
        </GlassCard>
        <Button title="Done" variant="secondary" onPress={() => router.replace('/(app)/(tabs)/ride')} />
        <Button
          title="Delete Ride"
          variant="ghost"
          onPress={() => {
            triggerWarningHaptic();
            Alert.alert('Delete this ride?', 'This will permanently remove the ride record and its route data.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => { deleteRide.mutate(ride.id); router.replace('/(app)/(tabs)/ride'); } },
            ]);
          }}
        />
      </AppScrollScreen>

      <View
        pointerEvents="none"
        collapsable={false}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 1080,
          height: 1920,
          transform: [{ translateX: -10000 }],
        }}>
        <ViewShot
          ref={storyShotRef}
          options={{
            result: 'tmpfile',
            quality: 1,
            width: 1080,
            height: 1920,
            format: 'png',
            handleGLSurfaceViewOnAndroid: true,
            useRenderInContext: true,
          }}>
          <IgStoryCanvas
            ride={ride}
            photoUri={draft.photoUri}
            templateId={draft.templateId}
            fuelPricePerLiter={latestFuelPrice}
            photoScale={draft.photoScale}
            photoOffsetX={draft.photoOffsetX}
            photoOffsetY={draft.photoOffsetY}
            overlayScale={draft.overlayScale}
            overlayOffsetX={draft.overlayOffsetX}
            overlayOffsetY={draft.overlayOffsetY}
            textTone={draft.textTone}
            width={1080}
          />
        </ViewShot>
      </View>
    </View>
  );
}
