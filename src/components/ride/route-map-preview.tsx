import { Platform, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { GlassCard } from '@/components/ui/glass-card';
import { palette } from '@/constants/theme';
import { getMapboxModule } from '@/lib/mapbox';
import type { RouteBounds } from '@/types/domain';

export function RouteMapPreview({
  routeGeoJson,
  lineColor = '#E63946',
  routeBounds,
}: {
  routeGeoJson?: GeoJSON.Feature<GeoJSON.LineString>;
  lineColor?: string;
  routeBounds?: RouteBounds;
}) {
  const Mapbox = getMapboxModule();

  if (Platform.OS === 'web' || !routeGeoJson || !Mapbox) {
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
      <Mapbox.MapView style={{ flex: 1 }} styleURL="mapbox://styles/mapbox/dark-v11" attributionEnabled={false} logoEnabled={false} compassEnabled={false} scaleBarEnabled={false}>
        {routeBounds ? (
          <Mapbox.Camera
            bounds={{
              ne: [routeBounds.maxLng, routeBounds.maxLat],
              sw: [routeBounds.minLng, routeBounds.minLat],
            }}
            padding={{ paddingTop: 40, paddingBottom: 40, paddingLeft: 40, paddingRight: 40 }}
            animationDuration={1000}
            animationMode="flyTo"
          />
        ) : firstCoordinate ? (
          <Mapbox.Camera zoomLevel={11} centerCoordinate={firstCoordinate} animationMode="flyTo" animationDuration={800} />
        ) : null}
        <Mapbox.ShapeSource id="ride-route" shape={routeGeoJson}>
          <Mapbox.LineLayer id="ride-route-line" style={{ lineColor, lineWidth: 3, lineCap: 'round' }} />
        </Mapbox.ShapeSource>
      </Mapbox.MapView>
    </View>
  );
}
