import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import { useLocalSearchParams, router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
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
import { useEarningsMutations, useFuelLogs, useRideMutations, useRides } from '@/hooks/use-kurbada-data';
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
  const rides = useRides(session?.user.id);
  const fuelLogs = useFuelLogs(session?.user.id);
  const ride = rides.data?.find((item) => item.id === params.rideId) ?? rides.data?.[0];
  const workMode = useAppStore((s) => s.workMode);
  const { saveEarnings } = useEarningsMutations(session?.user.id);
  const { updateRideMood } = useRideMutations(session?.user.id);
  const storyShotRef = useRef<any>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<RideStoryTemplateId>('distance_hero');
  const [storyPhoto, setStoryPhoto] = useState<string | undefined>();
  const [amountInput, setAmountInput] = useState('');
  const [platform, setPlatform] = useState<PlatformTag>('grab');
  const [earningsSaved, setEarningsSaved] = useState(false);
  const [mood, setMood] = useState<RideMood | null>(null);
  const [moodSaved, setMoodSaved] = useState(false);
  const latestFuelPrice = useMemo(() => {
    const logs = fuelLogs.data ?? [];
    return logs.length ? logs[0].price_per_liter : undefined;
  }, [fuelLogs.data]);

  if (!ride) {
    return null;
  }

  const handleSaveMood = async (next: RideMood) => {
    setMood(next);
    try {
      await updateRideMood.mutateAsync({ rideId: ride.id, mood: next });
      setMoodSaved(true);
    } catch {
      // No-op: mood is soft state; keep the selection for next attempt.
    }
  };

  const pickStoryPhoto = async () => {
    try {
      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
      });

      if (pickerResult.canceled || !pickerResult.assets?.length) {
        return;
      }

      setStoryPhoto(pickerResult.assets[0].uri);
    } catch (error) {
      Alert.alert('Photo picker failed', error instanceof Error ? error.message : 'Could not open photo library.');
    }
  };

  const captureAndShare = async () => {
    try {
      const uri = await storyShotRef.current?.capture?.();
      if (!uri) {
        throw new Error('Could not capture the story card.');
      }

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Share ride to Instagram',
        });
      } else {
        throw new Error('Sharing is not available on this device.');
      }
    } catch (error) {
      Alert.alert('Export failed', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const handleShareToStories = async () => {
    try {
      if (!storyPhoto) {
        await pickStoryPhoto();
        return;
      }

      InteractionManager.runAfterInteractions(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            void captureAndShare();
          });
        });
      });
    } catch (error) {
      Alert.alert('Export failed', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const handleSaveEarnings = async () => {
    const amount = Number(amountInput);
    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert('Invalid amount', 'Enter a valid earnings amount.');
      return;
    }
    if (!session?.user.id) {
      Alert.alert('Sign in required', 'You must be signed in to save earnings.');
      return;
    }
    try {
      await saveEarnings.mutateAsync({
        user_id: session.user.id,
        ride_id: ride.id,
        bike_id: ride.bike_id,
        earned_at: ride.ended_at.slice(0, 10),
        amount,
        platform,
        notes: null,
      });
      setEarningsSaved(true);
    } catch (error) {
      Alert.alert('Save failed', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const totalSeconds = ride.started_at && ride.ended_at
    ? Math.round((new Date(ride.ended_at).getTime() - new Date(ride.started_at).getTime()) / 1000)
    : 0;
  const estimatedFuelCost = (ride.fuel_used_liters ?? 0) * (latestFuelPrice ?? 65);

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
            <AppText variant="sectionTitle">Instagram Story Overlays</AppText>
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
            />
          </View>

          <View style={{ gap: 10 }}>
            <Button
              title={storyPhoto ? 'Change Photo' : 'Pick Album Photo'}
              variant="secondary"
              onPress={pickStoryPhoto}
            />
            {storyPhoto ? (
              <Button
                title="Use Route Background Instead"
                variant="ghost"
                onPress={() => setStoryPhoto(undefined)}
              />
            ) : null}
            <Button
              title="Share to Instagram"
              onPress={handleShareToStories}
              style={{ backgroundColor: palette.danger }}
            />
          </View>
        </GlassCard>
        <Button title="Done" variant="secondary" onPress={() => router.replace('/(app)/(tabs)/ride')} />
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
          options={{ result: 'tmpfile', quality: 1, width: 1080, height: 1920, format: 'png' }}>
          <IgStoryCanvas
            ride={ride}
            photoUri={storyPhoto}
            templateId={selectedTemplate}
            fuelPricePerLiter={latestFuelPrice}
            width={1080}
          />
        </ViewShot>
      </View>
    </View>
  );
}
