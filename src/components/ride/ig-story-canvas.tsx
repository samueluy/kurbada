import { LinearGradient } from 'expo-linear-gradient';
import { forwardRef } from 'react';
import { Image, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { palette } from '@/constants/theme';
import { getMapboxModule } from '@/lib/mapbox';
import { formatModeLabel } from '@/lib/format';
import type { RideRecord } from '@/types/domain';

export const IgStoryCanvas = forwardRef<View, { ride: RideRecord; photoUri?: string }>(function IgStoryCanvas(
  { ride, photoUri },
  ref,
) {
  const Mapbox = getMapboxModule();
  const coordinates = ride.route_geojson?.geometry.coordinates as [number, number][] | undefined;
  const showMap = Boolean(Mapbox && coordinates?.length);

  return (
    <View
      ref={ref}
      collapsable={false}
      style={{
        position: 'absolute',
        left: -10000,
        width: 1080,
        height: 1920,
        overflow: 'hidden',
        backgroundColor: palette.background,
      }}>
      {photoUri ? (
        <Image source={{ uri: photoUri }} style={{ position: 'absolute', inset: 0, width: 1080, height: 1920 }} resizeMode="cover" />
      ) : showMap && Mapbox && coordinates ? (
        <Mapbox.MapView
          style={{ position: 'absolute', inset: 0 }}
          styleURL="mapbox://styles/mapbox/dark-v11"
          attributionEnabled={false}
          logoEnabled={false}
          compassEnabled={false}
          scaleBarEnabled={false}
          scrollEnabled={false}
          zoomEnabled={false}>
          <Mapbox.Camera zoomLevel={10} centerCoordinate={coordinates![0]} animationMode="none" />
          <Mapbox.ShapeSource id="ig-route" shape={ride.route_geojson}>
            <Mapbox.LineLayer id="ig-route-line" style={{ lineColor: palette.danger, lineWidth: 4, lineBlur: 1 }} />
          </Mapbox.ShapeSource>
        </Mapbox.MapView>
      ) : null}

      <LinearGradient
        colors={['rgba(0,0,0,0.08)', 'rgba(0,0,0,0.85)']}
        style={{
          position: 'absolute',
          inset: 0,
          paddingHorizontal: 80,
          paddingBottom: 120,
          justifyContent: 'flex-end',
          gap: 32,
        }}>
        <View style={{ gap: 8 }}>
          <AppText variant="label" style={{ color: palette.textSecondary, fontSize: 24 }}>
            {formatModeLabel(ride.mode).toUpperCase()} RIDE
          </AppText>
          <AppText variant="heroMetric" style={{ color: '#FFFFFF', fontSize: 130, lineHeight: 130 }}>
            {ride.distance_km.toFixed(1)} KM
          </AppText>
        </View>

        <View style={{ flexDirection: 'row', gap: 40 }}>
          <View style={{ gap: 4 }}>
            <AppText variant="label" style={{ color: palette.textTertiary, fontSize: 20 }}>
              TOP SPEED
            </AppText>
            <AppText variant="label" style={{ color: '#FFFFFF', fontSize: 48 }}>
              {ride.max_speed_kmh.toFixed(0)} KM/H
            </AppText>
          </View>
          {ride.max_lean_angle_deg ? (
            <View style={{ gap: 4 }}>
              <AppText variant="label" style={{ color: palette.textTertiary, fontSize: 20 }}>
                MAX LEAN
              </AppText>
              <AppText variant="label" style={{ color: palette.danger, fontSize: 48 }}>
                {ride.max_lean_angle_deg.toFixed(0)}°
              </AppText>
            </View>
          ) : null}
          <View style={{ gap: 4 }}>
            <AppText variant="label" style={{ color: palette.textTertiary, fontSize: 20 }}>
              AVG SPEED
            </AppText>
            <AppText variant="label" style={{ color: '#FFFFFF', fontSize: 48 }}>
              {ride.avg_speed_kmh.toFixed(0)} KM/H
            </AppText>
          </View>
        </View>

        <View style={{ width: '100%', height: 0.5, backgroundColor: 'rgba(255,255,255,0.12)' }} />

        <View style={{ gap: 4 }}>
          <AppText variant="label" style={{ color: '#FFFFFF', fontSize: 32, letterSpacing: 8 }}>
            KURBADA
          </AppText>
          <AppText variant="meta" style={{ color: palette.textTertiary, fontSize: 20 }}>
            Tracked with Kurbada
          </AppText>
        </View>
      </LinearGradient>
    </View>
  );
});
