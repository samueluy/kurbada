import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { palette, radius } from '@/constants/theme';
import { formatModeLabel } from '@/lib/format';
import { getMapboxModule } from '@/lib/mapbox';
import type { RideRecord } from '@/types/domain';

export function RideMapThumbnail({ ride }: { ride: RideRecord }) {
  const Mapbox = getMapboxModule();
  const coordinates = ride.route_geojson?.geometry.coordinates as [number, number][] | undefined;
  const center = coordinates?.[0];

  return (
    <View
      style={{
        height: 110,
        borderRadius: radius.md,
        overflow: 'hidden',
        backgroundColor: '#0B1012',
      }}>
      {Mapbox && coordinates?.length && center ? (
        <Mapbox.MapView style={{ flex: 1 }} styleURL="mapbox://styles/mapbox/light-v11" logoEnabled={false} compassEnabled={false} scaleBarEnabled={false}>
          <Mapbox.Camera zoomLevel={11} centerCoordinate={center} animationMode="none" />
          <Mapbox.ShapeSource id={`ride-thumb-${ride.id}`} shape={ride.route_geojson}>
            <Mapbox.LineLayer
              id={`ride-thumb-line-${ride.id}`}
              style={{ lineColor: palette.danger, lineWidth: 2.4, lineBlur: 0.8, lineOpacity: 0.96 }}
            />
          </Mapbox.ShapeSource>
        </Mapbox.MapView>
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
          <AppText variant="meta" style={{ color: '#FFFFFF' }}>
            Native Mapbox preview appears in a development build.
          </AppText>
        </View>
      )}

      <View
        style={{
          position: 'absolute',
          left: 10,
          bottom: 10,
          backgroundColor: 'rgba(10,10,10,0.72)',
          borderRadius: radius.pill,
          paddingHorizontal: 10,
          paddingVertical: 4,
        }}>
        <AppText variant="label" style={{ color: '#FFFFFF' }}>
          {formatModeLabel(ride.mode)}
        </AppText>
      </View>
    </View>
  );
}
