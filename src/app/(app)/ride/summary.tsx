import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { useLocalSearchParams, router } from 'expo-router';
import { useRef } from 'react';
import { Alert, View } from 'react-native';
import ViewShot from 'react-native-view-shot';

import { RouteMapPreview } from '@/components/ride/route-map-preview';
import { ShareCard } from '@/components/ride/share-card';
import { AppText } from '@/components/ui/app-text';
import { AppScrollScreen } from '@/components/ui/app-screen';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { SectionHeader } from '@/components/ui/section-header';
import { StatCard } from '@/components/ui/stat-card';
import { useAuth } from '@/hooks/use-auth';
import { useRides } from '@/hooks/use-kurbada-data';

export default function RideSummaryScreen() {
  const params = useLocalSearchParams<{ rideId?: string }>();
  const { session } = useAuth();
  const rides = useRides(session?.user.id);
  const ride = rides.data?.find((item) => item.id === params.rideId) ?? rides.data?.[0];
  const shotRef = useRef<any>(null);

  if (!ride) {
    return null;
  }

  return (
    <AppScrollScreen>
      <GlassCard style={{ gap: 12, padding: 20 }}>
        <AppText variant="label">Ride saved</AppText>
        <AppText variant="heroMetric" style={{ fontSize: 60 }}>{ride.distance_km.toFixed(1)} km</AppText>
      </GlassCard>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <StatCard label="Top Speed" value={ride.max_speed_kmh.toFixed(0)} unit="km/h" />
        <StatCard label="Avg Speed" value={ride.avg_speed_kmh.toFixed(0)} unit="km/h" />
        {ride.max_lean_angle_deg ? <StatCard label="Max Lean" value={ride.max_lean_angle_deg.toFixed(0)} unit="deg" accent /> : null}
      </View>

      <View style={{ height: 220 }}>
        <RouteMapPreview routeGeoJson={ride.route_geojson} />
      </View>

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
    </AppScrollScreen>
  );
}
