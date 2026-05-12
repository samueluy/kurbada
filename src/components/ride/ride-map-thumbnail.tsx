import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { AppText } from '@/components/ui/app-text';
import { radius } from '@/constants/theme';
import { formatModeLabel } from '@/lib/format';
import type { RideFeedRecord, RideRecord } from '@/types/domain';

function buildPreviewPath(coordinates: [number, number][], width: number, height: number) {
  if (!coordinates.length) {
    return '';
  }

  let minLng = coordinates[0][0];
  let maxLng = coordinates[0][0];
  let minLat = coordinates[0][1];
  let maxLat = coordinates[0][1];

  coordinates.forEach(([lng, lat]) => {
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  });

  const lngSpan = Math.max(maxLng - minLng, 0.0001);
  const latSpan = Math.max(maxLat - minLat, 0.0001);
  const inset = 12;

  return coordinates
    .map(([lng, lat], index) => {
      const x = inset + ((lng - minLng) / lngSpan) * (width - inset * 2);
      const y = inset + (1 - (lat - minLat) / latSpan) * (height - inset * 2);
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

export function RideMapThumbnail({ ride }: { ride: RideRecord | RideFeedRecord }) {
  const previewRoute = ride.route_preview_geojson ?? ('route_geojson' in ride ? ride.route_geojson : null);
  const coordinates = (previewRoute?.geometry?.coordinates ?? []) as [number, number][];
  const width = 320;
  const height = 110;
  const path = buildPreviewPath(coordinates, width, height);

  return (
    <View
      style={{
        height,
        borderRadius: radius.md,
        overflow: 'hidden',
        backgroundColor: '#0B1012',
      }}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="ride-thumb-bg" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#11171C" />
            <Stop offset="1" stopColor="#0A0D10" />
          </LinearGradient>
          <LinearGradient id="ride-thumb-line" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#E63946" />
            <Stop offset="1" stopColor="#C0392B" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width={width} height={height} fill="url(#ride-thumb-bg)" />
        {[1, 2, 3].map((line) => (
          <Path
            key={`grid-h-${line}`}
            d={`M 0 ${(height / 4) * line} L ${width} ${(height / 4) * line}`}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth="1"
          />
        ))}
        {[1, 2, 3].map((line) => (
          <Path
            key={`grid-v-${line}`}
            d={`M ${(width / 4) * line} 0 L ${(width / 4) * line} ${height}`}
            stroke="rgba(255,255,255,0.04)"
            strokeWidth="1"
          />
        ))}
        {path ? (
          <Path
            d={path}
            stroke="url(#ride-thumb-line)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        ) : null}
      </Svg>

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
