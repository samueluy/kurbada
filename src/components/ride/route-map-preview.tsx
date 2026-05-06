import { Platform, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { GlassCard } from '@/components/ui/glass-card';
import { palette } from '@/constants/theme';
import { env } from '@/lib/env';
import { getMapboxModule } from '@/lib/mapbox';

export function RouteMapPreview({ routeGeoJson }: { routeGeoJson?: GeoJSON.Feature<GeoJSON.LineString> }) {
  const Mapbox = getMapboxModule();

  if (Platform.OS === 'web' || !env.mapboxToken || !routeGeoJson || !Mapbox) {
    return (
      <GlassCard style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8, padding: 20 }}>
        <AppText variant="label">Route preview</AppText>
        <AppText variant="bodyBold">Native map standby</AppText>
        <AppText variant="caption" style={{ textAlign: 'center', color: palette.textSecondary }}>
          Mapbox appears automatically in a native development build once the access token is available.
        </AppText>
      </GlassCard>
    );
  }

  const coordinates = routeGeoJson.geometry.coordinates as [number, number][];
  const firstCoordinate = coordinates[0];

  return (
    <View style={{ flex: 1, overflow: 'hidden', borderRadius: 16 }}>
      <Mapbox.MapView style={{ flex: 1 }} styleURL="mapbox://styles/mapbox/dark-v11">
        {firstCoordinate ? (
          <Mapbox.Camera zoomLevel={11} centerCoordinate={firstCoordinate} animationMode="none" />
        ) : null}
        <Mapbox.ShapeSource id="ride-route" shape={routeGeoJson}>
          <Mapbox.LineLayer id="ride-route-line" style={{ lineColor: palette.danger, lineWidth: 3 }} />
        </Mapbox.ShapeSource>
      </Mapbox.MapView>
    </View>
  );
}
