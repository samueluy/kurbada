import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import { useLocalSearchParams, router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import ViewShot from 'react-native-view-shot';

import { RouteMapPreview } from '@/components/ride/route-map-preview';
import { IgStoryCanvas } from '@/components/ride/ig-story-canvas';
import { AppText } from '@/components/ui/app-text';
import { AppScrollScreen } from '@/components/ui/app-screen';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { SectionHeader } from '@/components/ui/section-header';
import { StatCard } from '@/components/ui/stat-card';
import { formatDuration } from '@/lib/format';
import { useAuth } from '@/hooks/use-auth';
import { useFuelLogs, useRides } from '@/hooks/use-kurbada-data';
import { palette, radius } from '@/constants/theme';
import { rideStoryTemplates, type RideStoryTemplateId } from '@/lib/ride-story';

export default function RideSummaryScreen() {
  const params = useLocalSearchParams<{ rideId?: string }>();
  const { session } = useAuth();
  const rides = useRides(session?.user.id);
  const fuelLogs = useFuelLogs(session?.user.id);
  const ride = rides.data?.find((item) => item.id === params.rideId) ?? rides.data?.[0];
  const storyShotRef = useRef<any>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<RideStoryTemplateId>('distance_hero');
  const [storyPhoto, setStoryPhoto] = useState<string | undefined>();
  const latestFuelPrice = useMemo(() => {
    const logs = fuelLogs.data ?? [];
    return logs.length ? logs[0].price_per_liter : undefined;
  }, [fuelLogs.data]);

  if (!ride) {
    return null;
  }

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

  const handleShareToStories = async () => {
    try {
      if (!storyPhoto) {
        await pickStoryPhoto();
        return;
      }

      setTimeout(async () => {
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
          }
        } catch (error) {
          Alert.alert('Export failed', error instanceof Error ? error.message : 'Please try again.');
        }
      }, 500);
    } catch (error) {
      Alert.alert('Export failed', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const totalSeconds = ride.started_at && ride.ended_at
    ? Math.round((new Date(ride.ended_at).getTime() - new Date(ride.started_at).getTime()) / 1000)
    : 0;

  return (
    <AppScrollScreen>
      <GlassCard style={{ gap: 12, padding: 20 }}>
        <AppText variant="label">Ride saved</AppText>
        <AppText variant="heroMetric" style={{ fontSize: 48, color: palette.text }}>{ride.distance_km.toFixed(1)} km</AppText>
      </GlassCard>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <StatCard label="Top Speed" value={ride.max_speed_kmh.toFixed(0)} unit="km/h" />
        <StatCard label="Avg Speed" value={ride.avg_speed_kmh.toFixed(0)} unit="km/h" />
        {ride.max_lean_angle_deg ? <StatCard label="Max Lean" value={ride.max_lean_angle_deg.toFixed(0)} unit="deg" accent /> : null}
        <StatCard label="Total Time" value={formatDuration(totalSeconds)} />
      </View>

      <View style={{ height: 260 }}>
        <RouteMapPreview
          routeGeoJson={ride.route_geojson}
          lineColor="#E63946"
          routeBounds={ride.route_bounds}
        />
      </View>

      <SectionHeader title="Share" />

      <GlassCard style={{ gap: 16, padding: 16 }}>
        <View style={{ gap: 6 }}>
          <AppText variant="sectionTitle">Instagram Story Overlays</AppText>
          <AppText variant="meta" style={{ color: palette.textSecondary }}>
            Pick a gallery photo, switch between five templates, then export straight from your phone. Nothing gets uploaded.
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

      <ViewShot ref={storyShotRef} options={{ result: 'tmpfile', quality: 1, width: 1080, height: 1920, format: 'png' }}>
        <IgStoryCanvas
          ride={ride}
          photoUri={storyPhoto}
          templateId={selectedTemplate}
          fuelPricePerLiter={latestFuelPrice}
          hidden
        />
      </ViewShot>
    </AppScrollScreen>
  );
}
