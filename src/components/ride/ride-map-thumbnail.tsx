import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { palette, radius } from '@/constants/theme';
import { formatModeLabel } from '@/lib/format';
import { getMapboxModule } from '@/lib/mapbox';
import type { RideRecord } from '@/types/domain';

export function RideMapThumbnail({ ride }: { ride: RideRecord }) {
  const Mapbox = getMapboxModule();
  const coordinates = ride.route_geojson?.geometry.coordinates as [number, number][] | undefined;

  return (
    <View
      style={{
        height: 110,
        borderRadius: radius.md,
        overflow: 'hidden',
        backgroundColor: '#0D1B2A',
      }}>
      {Mapbox && coordinates?.length ? (
        <Mapbox.MapView style={{ flex: 1 }} styleURL="mapbox://styles/mapbox/dark-v11" attributionEnabled={false} logoEnabled={false} compassEnabled={false} scaleBarEnabled={false}>
          <Mapbox.Camera zoomLevel={11} centerCoordinate={coordinates[0]} animationMode="none" />
          <Mapbox.ShapeSource id={`ride-thumb-${ride.id}`} shape={ride.route_geojson}>
            <Mapbox.LineLayer
              id={`ride-thumb-line-${ride.id}`}
              style={{ lineColor: palette.danger, lineWidth: 2.4, lineBlur: 0.8, lineOpacity: 0.96 }}
            />
          </Mapbox.ShapeSource>
        </Mapbox.MapView>
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
          <AppText variant="meta" style={{ color: '#FFFFFF', textAlign: 'center' }}>
            Native Mapbox preview appears in dev build
          </AppText>
        </View>
      )}

      <View
        style={{
          position: 'absolute',
          left: 10,
          bottom: 10,
          backgroundColor: palette.surfaceMuted,
          borderRadius: radius.xs,
          paddingHorizontal: 8,
          paddingVertical: 3,
        }}>
        <AppText variant="label" style={{ color: palette.textSecondary, letterSpacing: 1 }}>
          {formatModeLabel(ride.mode)}
        </AppText>
      </View>
    </View>
  );
}
