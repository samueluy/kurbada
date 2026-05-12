import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, InteractionManager, Modal, Pressable, ScrollView, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS, useAnimatedReaction, useSharedValue } from 'react-native-reanimated';
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
import { useAppStore, type PlatformTag } from '@/store/app-store';
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

  useEffect(() => {
    setMood(ride?.mood ?? null);
  }, [ride?.mood]);

  const handleSaveMood = async (next: RideMood) => {
    if (!ride) return;
    setMood(next);
    try { await updateRideMood.mutateAsync({ rideId: ride.id, mood: next }); setMoodSaved(true); } catch { /* */ }
  };

  const handleSaveEarnings = async () => {
    if (!ride || !session?.user.id) return;
    const amount = Number(amountInput);
    if (!Number.isFinite(amount) || amount <= 0) { Alert.alert('Invalid amount', 'Enter a valid amount.'); return; }
    try {
      await saveEarnings.mutateAsync({ user_id: session.user.id, ride_id: ride.id, bike_id: ride.bike_id, earned_at: ride.ended_at.slice(0, 10), amount, platform, notes: null });
      setEarningsSaved(true);
    } catch (error) { Alert.alert('Save failed', error instanceof Error ? error.message : 'Please try again.'); }
  };

  const pickStoryPhoto = async () => {
    try {
      const pickerResult = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
      if (pickerResult.canceled || !pickerResult.assets?.length) return;
      setStoryPhoto(pickerResult.assets[0].uri);
      setPhotoScale(1.3); setPhotoOffsetX(0); setPhotoOffsetY(-40);
      setAdjustMode('photo');
      setShowPhotoAdjust(true);
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
    if (!storyPhoto) { await pickStoryPhoto(); return; }
    InteractionManager.runAfterInteractions(() => { void captureAndShare(); });
  };
  const [selectedTemplate, setSelectedTemplate] = useState<RideStoryTemplateId>('distance_hero');
  const [storyPhoto, setStoryPhoto] = useState<string | undefined>();
  const [showPhotoAdjust, setShowPhotoAdjust] = useState(false);
  const [adjustMode, setAdjustMode] = useState<'photo' | 'template'>('photo');
  const [photoScale, setPhotoScale] = useState(1.3);
  const [photoOffsetX, setPhotoOffsetX] = useState(0);
  const [photoOffsetY, setPhotoOffsetY] = useState(-40);
  const [overlayScale, setOverlayScale] = useState(1);
  const [overlayOffsetX, setOverlayOffsetX] = useState(0);
  const [overlayOffsetY, setOverlayOffsetY] = useState(0);
  const draftPhotoScale = useSharedValue(1.3);
  const draftPhotoOffsetX = useSharedValue(0);
  const draftPhotoOffsetY = useSharedValue(-40);
  const draftOverlayScale = useSharedValue(1);
  const draftOverlayOffsetX = useSharedValue(0);
  const draftOverlayOffsetY = useSharedValue(0);
  const gestureStartScale = useSharedValue(1);
  const gestureStartX = useSharedValue(0);
  const gestureStartY = useSharedValue(0);
  const adjustModeValue = useSharedValue<0 | 1>(0);

  useEffect(() => {
    adjustModeValue.value = adjustMode === 'photo' ? 0 : 1;
  }, [adjustMode, adjustModeValue]);

  useEffect(() => {
    if (!showPhotoAdjust) return;
    draftPhotoScale.value = photoScale;
    draftPhotoOffsetX.value = photoOffsetX;
    draftPhotoOffsetY.value = photoOffsetY;
    draftOverlayScale.value = overlayScale;
    draftOverlayOffsetX.value = overlayOffsetX;
    draftOverlayOffsetY.value = overlayOffsetY;
  }, [
    adjustMode,
    draftOverlayOffsetX,
    draftOverlayOffsetY,
    draftOverlayScale,
    draftPhotoOffsetX,
    draftPhotoOffsetY,
    draftPhotoScale,
    overlayOffsetX,
    overlayOffsetY,
    overlayScale,
    photoOffsetX,
    photoOffsetY,
    photoScale,
    showPhotoAdjust,
  ]);

  useAnimatedReaction(
    () => ({
      photoScale: draftPhotoScale.value,
      photoOffsetX: draftPhotoOffsetX.value,
      photoOffsetY: draftPhotoOffsetY.value,
      overlayScale: draftOverlayScale.value,
      overlayOffsetX: draftOverlayOffsetX.value,
      overlayOffsetY: draftOverlayOffsetY.value,
    }),
    (next, previous) => {
      if (
        previous
        && next.photoScale === previous.photoScale
        && next.photoOffsetX === previous.photoOffsetX
        && next.photoOffsetY === previous.photoOffsetY
        && next.overlayScale === previous.overlayScale
        && next.overlayOffsetX === previous.overlayOffsetX
        && next.overlayOffsetY === previous.overlayOffsetY
      ) {
        return;
      }

      runOnJS(setPhotoScale)(Number(next.photoScale.toFixed(3)));
      runOnJS(setPhotoOffsetX)(Number(next.photoOffsetX.toFixed(1)));
      runOnJS(setPhotoOffsetY)(Number(next.photoOffsetY.toFixed(1)));
      runOnJS(setOverlayScale)(Number(next.overlayScale.toFixed(3)));
      runOnJS(setOverlayOffsetX)(Number(next.overlayOffsetX.toFixed(1)));
      runOnJS(setOverlayOffsetY)(Number(next.overlayOffsetY.toFixed(1)));
    },
  );

  const editorGesture = useMemo(() => Gesture.Simultaneous(
    Gesture.Pan()
      .onBegin(() => {
        gestureStartX.value = adjustModeValue.value === 0 ? draftPhotoOffsetX.value : draftOverlayOffsetX.value;
        gestureStartY.value = adjustModeValue.value === 0 ? draftPhotoOffsetY.value : draftOverlayOffsetY.value;
      })
      .onUpdate((event) => {
        if (adjustModeValue.value === 0) {
          draftPhotoOffsetX.value = gestureStartX.value + event.translationX;
          draftPhotoOffsetY.value = gestureStartY.value + event.translationY;
          return;
        }
        draftOverlayOffsetX.value = gestureStartX.value + event.translationX;
        draftOverlayOffsetY.value = gestureStartY.value + event.translationY;
      }),
    Gesture.Pinch()
      .onBegin(() => {
        gestureStartScale.value = adjustModeValue.value === 0 ? draftPhotoScale.value : draftOverlayScale.value;
      })
      .onUpdate((event) => {
        const nextScale = Math.max(0.6, Math.min(3, gestureStartScale.value * event.scale));
        if (adjustModeValue.value === 0) {
          draftPhotoScale.value = nextScale;
          return;
        }
        draftOverlayScale.value = nextScale;
      }),
  ), [
    adjustModeValue,
    draftOverlayOffsetX,
    draftOverlayOffsetY,
    draftOverlayScale,
    draftPhotoOffsetX,
    draftPhotoOffsetY,
    draftPhotoScale,
    gestureStartScale,
    gestureStartX,
    gestureStartY,
  ]);
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
              The summary could not find a saved ride for that link.
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
              const active = selectedTemplate === template.id;
              return (
                <Button
                  key={template.id}
                  title={template.label}
                  variant={active ? 'primary' : 'secondary'}
                  onPress={() => setSelectedTemplate(template.id)}
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

          <View style={{ alignItems: 'center' }}>
            <IgStoryCanvas
              ride={ride}
              photoUri={storyPhoto}
              templateId={selectedTemplate}
              fuelPricePerLiter={latestFuelPrice}
              width={240}
              photoScale={photoScale}
              photoOffsetX={photoOffsetX}
              photoOffsetY={photoOffsetY}
              overlayScale={overlayScale}
              overlayOffsetX={overlayOffsetX}
              overlayOffsetY={overlayOffsetY}
            />
          </View>

          <View style={{ gap: 10 }}>
            <Button
              title={storyPhoto ? 'Change Photo' : 'Pick Album Photo'}
              variant="secondary"
              onPress={pickStoryPhoto}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Button
                  title="Adjust Photo"
                  variant="secondary"
                  onPress={() => {
                    setAdjustMode('photo');
                    setShowPhotoAdjust(true);
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title="Adjust Template"
                  variant="secondary"
                  onPress={() => {
                    setAdjustMode('template');
                    setShowPhotoAdjust(true);
                  }}
                />
              </View>
            </View>
            {storyPhoto ? (
              <Button
                title="Use Route Background Instead"
                variant="ghost"
                onPress={() => {
                  setStoryPhoto(undefined);
                  setPhotoScale(1.3);
                  setPhotoOffsetX(0);
                  setPhotoOffsetY(-40);
                }}
              />
            ) : null}
            <Button
              title="Share"
              onPress={handleShareToStories}
              style={{ backgroundColor: palette.danger }}
            />
          </View>
        </GlassCard>
        <Button title="Done" variant="secondary" onPress={() => router.replace('/(app)/(tabs)/ride')} />
        <Button
          title="Delete Ride"
          variant="ghost"
          onPress={() => {
            Alert.alert('Delete this ride?', 'This will permanently remove the ride record and its route data.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => { deleteRide.mutate(ride.id); router.replace('/(app)/(tabs)/ride'); } },
            ]);
          }}
        />
      </AppScrollScreen>

      <Modal visible={showPhotoAdjust} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', paddingHorizontal: 20, gap: 16 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable
              onPress={() => setAdjustMode('photo')}
              style={{
                flex: 1,
                borderRadius: radius.pill,
                paddingVertical: 10,
                alignItems: 'center',
                backgroundColor: adjustMode === 'photo' ? palette.text : 'rgba(255,255,255,0.06)',
              }}>
              <AppText variant="button" style={{ fontSize: 12, color: adjustMode === 'photo' ? palette.background : palette.textSecondary }}>
                Photo
              </AppText>
            </Pressable>
            <Pressable
              onPress={() => setAdjustMode('template')}
              style={{
                flex: 1,
                borderRadius: radius.pill,
                paddingVertical: 10,
                alignItems: 'center',
                backgroundColor: adjustMode === 'template' ? palette.text : 'rgba(255,255,255,0.06)',
              }}>
              <AppText variant="button" style={{ fontSize: 12, color: adjustMode === 'template' ? palette.background : palette.textSecondary }}>
                Template
              </AppText>
            </Pressable>
          </View>

          <GestureDetector gesture={editorGesture}>
            <View style={{ alignItems: 'center' }}>
              <IgStoryCanvas
                ride={ride}
                photoUri={storyPhoto}
                templateId={selectedTemplate}
                fuelPricePerLiter={latestFuelPrice}
                photoScale={photoScale}
                photoOffsetX={photoOffsetX}
                photoOffsetY={photoOffsetY}
                overlayScale={overlayScale}
                overlayOffsetX={overlayOffsetX}
                overlayOffsetY={overlayOffsetY}
                width={300}
              />
            </View>
          </GestureDetector>

          <View style={{ gap: 8 }}>
            <AppText variant="meta" style={{ color: palette.textSecondary, textAlign: 'center', fontSize: 12 }}>
              {adjustMode === 'photo'
                ? 'Pinch to zoom the photo and drag to position it.'
                : 'Pinch to scale the template and drag it into place.'}
            </AppText>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Button
                  title="Reset"
                  variant="secondary"
                  onPress={() => {
                    if (adjustMode === 'photo') {
                      draftPhotoScale.value = 1.3;
                      draftPhotoOffsetX.value = 0;
                      draftPhotoOffsetY.value = -40;
                      return;
                    }

                    draftOverlayScale.value = 1;
                    draftOverlayOffsetX.value = 0;
                    draftOverlayOffsetY.value = 0;
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title="Done"
                  onPress={() => setShowPhotoAdjust(false)}
                  style={{ backgroundColor: palette.danger }}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>

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
          options={{ result: 'tmpfile', quality: 1, width: 1080, height: 1920, format: 'png' }}>
          <IgStoryCanvas
            ride={ride}
            photoUri={storyPhoto}
            templateId={selectedTemplate}
            fuelPricePerLiter={latestFuelPrice}
            photoScale={photoScale}
            photoOffsetX={photoOffsetX}
            photoOffsetY={photoOffsetY}
            overlayScale={overlayScale}
            overlayOffsetX={overlayOffsetX}
            overlayOffsetY={overlayOffsetY}
            width={1080}
          />
        </ViewShot>
      </View>
    </View>
  );
}
