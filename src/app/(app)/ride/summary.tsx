import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { useLocalSearchParams, router } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, Platform, View } from 'react-native';
import ViewShot from 'react-native-view-shot';

import { RouteMapPreview } from '@/components/ride/route-map-preview';
import { ShareCard } from '@/components/ride/share-card';
import { IgStoryCanvas } from '@/components/ride/ig-story-canvas';
import { AppText } from '@/components/ui/app-text';
import { AppScrollScreen } from '@/components/ui/app-screen';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { SectionHeader } from '@/components/ui/section-header';
import { StatCard } from '@/components/ui/stat-card';
import { formatDuration } from '@/lib/format';
import { useAuth } from '@/hooks/use-auth';
import { useRides } from '@/hooks/use-kurbada-data';
import { palette } from '@/constants/theme';

export default function RideSummaryScreen() {
  const params = useLocalSearchParams<{ rideId?: string }>();
  const { session } = useAuth();
  const rides = useRides(session?.user.id);
  const ride = rides.data?.find((item) => item.id === params.rideId) ?? rides.data?.[0];
  const shotRef = useRef<any>(null);
  const storyShotRef = useRef<any>(null);
  const [storyPhoto, setStoryPhoto] = useState<string | undefined>();

  if (!ride) {
    return null;
  }

  const handleShareToStories = async () => {
    try {
      const pickerResult = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 1,
      });

      if (pickerResult.canceled || !pickerResult.assets?.length) {
        return;
      }

      setStoryPhoto(pickerResult.assets[0].uri);

      setTimeout(async () => {
        try {
          const uri = await storyShotRef.current?.capture?.();
          if (!uri) {
            throw new Error('Could not capture the story card.');
          }

          await MediaLibrary.saveToLibraryAsync(uri);
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(uri);
          }
        } catch (error) {
          Alert.alert('Export failed', error instanceof Error ? error.message : 'Please try again.');
        } finally {
          setStoryPhoto(undefined);
        }
      }, 500);
    } catch (error) {
      Alert.alert('Photo picker failed', error instanceof Error ? error.message : 'Could not open photo library.');
    }
  };

  const totalSeconds = ride.started_at && ride.ended_at
    ? Math.round((new Date(ride.ended_at).getTime() - new Date(ride.started_at).getTime()) / 1000)
    : 0;

  return (
    <AppScrollScreen>
      <GlassCard style={{ gap: 12, padding: 20 }}>
        <AppText variant="label">Ride saved</AppText>
        <AppText variant="heroMetric" style={{ fontSize: 48, fontFamily: Platform.OS === 'ios' ? 'DMMono_500Medium' : 'monospace', color: palette.text }}>{ride.distance_km.toFixed(1)} km</AppText>
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

      <Button
        title="Share to Social"
        onPress={handleShareToStories}
        style={{ backgroundColor: palette.danger }}
      />

      <SectionHeader title="Create Share Card" />
      <ViewShot ref={shotRef} options={{ result: 'tmpfile', quality: 1, width: 1080, height: 1080, format: 'png' }}>
        <ShareCard ride={ride} />
      </ViewShot>
      <Button
        title="Export Share Card"
        onPress={async () => {
          try {
            const permission = await MediaLibrary.requestPermissionsAsync();
            if (!permission.granted) {
              throw new Error('Media library permission is required to export the card.');
            }

            const uri = await shotRef.current?.capture?.();
            if (!uri) {
              throw new Error('Could not capture the share card.');
            }

            await MediaLibrary.saveToLibraryAsync(uri);
            if (await Sharing.isAvailableAsync()) {
              await Sharing.shareAsync(uri);
            }
          } catch (error) {
            Alert.alert('Export failed', error instanceof Error ? error.message : 'Please try again.');
          }
        }}
      />
      <Button title="Done" variant="secondary" onPress={() => router.replace('/(app)/(tabs)/ride')} />

      <ViewShot ref={storyShotRef} options={{ result: 'tmpfile', quality: 1, width: 1080, height: 1920, format: 'png' }}>
        <IgStoryCanvas ride={ride} photoUri={storyPhoto} />
      </ViewShot>
    </AppScrollScreen>
  );
}
