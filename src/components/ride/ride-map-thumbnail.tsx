import { Image, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { radius } from '@/constants/theme';
import { formatModeLabel } from '@/lib/format';
import { getStaticRideMapUrl, normalizeStaticMapCoordinates } from '@/lib/static-map';
import type { RideFeedRecord, RideRecord } from '@/types/domain';

export function RideMapThumbnail({ ride }: { ride: RideRecord | RideFeedRecord }) {
  const previewRoute = ride.route_preview_geojson ?? ('route_geojson' in ride ? ride.route_geojson : null);
  const coordinates = normalizeStaticMapCoordinates(previewRoute?.geometry?.coordinates ?? []);
  const mapUrl = getStaticRideMapUrl({
    coordinates,
    width: 320,
    height: 110,
    routeBounds: ride.route_bounds,
  });

  return (
    <View
      style={{
        height: 110,
        borderRadius: radius.md,
        overflow: 'hidden',
        backgroundColor: '#0B1012',
      }}>
      {mapUrl ? (
        <Image
          source={{ uri: mapUrl }}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
        />
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 }}>
          <AppText variant="bodyBold" style={{ color: '#FFFFFF', textAlign: 'center' }}>
            Route preview unavailable
          </AppText>
          <AppText variant="meta" style={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginTop: 4 }}>
            This ride has no usable preview route yet.
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
