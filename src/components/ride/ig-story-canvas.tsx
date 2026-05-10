import { LinearGradient } from 'expo-linear-gradient';
import { forwardRef } from 'react';
import { Image, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { palette, radius } from '@/constants/theme';
import { getMapboxModule } from '@/lib/mapbox';
import { getRideStoryPrimaryValue, getRideStoryTitle, type RideStoryTemplateId } from '@/lib/ride-story';
import type { RideRecord } from '@/types/domain';

type IgStoryCanvasProps = {
  ride: RideRecord;
  photoUri?: string;
  templateId: RideStoryTemplateId;
  fuelPricePerLiter?: number;
  width?: number;
  hidden?: boolean;
};

function MiniStat({
  label,
  value,
  width,
  accent = false,
}: {
  label: string;
  value: string;
  width: number;
  accent?: boolean;
}) {
  return (
    <View style={{ gap: width * 0.004 }}>
      <AppText
        variant="label"
        style={{
          color: 'rgba(255,255,255,0.6)',
          fontSize: width * 0.022,
          lineHeight: width * 0.026,
        }}>
        {label}
      </AppText>
      <AppText
        variant="label"
        style={{
          color: accent ? palette.danger : '#FFFFFF',
          fontSize: width * 0.032,
          lineHeight: width * 0.036,
        }}>
        {value}
      </AppText>
    </View>
  );
}

export const IgStoryCanvas = forwardRef<View, IgStoryCanvasProps>(function IgStoryCanvas(
  {
    ride,
    photoUri,
    templateId,
    fuelPricePerLiter,
    width = 1080,
    hidden = false,
  },
  ref,
) {
  const Mapbox = getMapboxModule();
  const coordinates = ride.route_geojson?.geometry.coordinates as [number, number][] | undefined;
  const showMap = Boolean(!hidden && Mapbox && coordinates?.length);
  const height = Math.round(width * (1920 / 1080));
  const primary = getRideStoryPrimaryValue(ride, templateId, fuelPricePerLiter);
  const accentPrimary = templateId === 'max_lean_hero' || templateId === 'fuel_burn';
  const showPhoto = Boolean(photoUri);

  // Overlay card geometry (top-left corner, ~42% width)
  const overlayTop = width * 0.12;
  const overlayLeft = width * 0.06;
  const overlayWidth = width * 0.42;
  const overlayPadding = width * 0.028;
  const overlayGap = width * 0.016;
  const overlayBorderRadius = radius.xl;

  return (
    <View
      ref={ref}
      collapsable={false}
      style={[
        {
          width,
          height,
          overflow: 'hidden',
          backgroundColor: palette.background,
          borderRadius: hidden ? 0 : radius.xl,
        },
        hidden
          ? {
              position: 'absolute',
              top: 0,
              left: 0,
              opacity: 0.01,
              zIndex: -1,
            }
          : null,
      ]}>
      {showPhoto ? (
        <Image
          source={{ uri: photoUri }}
          style={{ position: 'absolute', inset: 0, width, height }}
          resizeMode="cover"
        />
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
          <Mapbox.Camera zoomLevel={10} centerCoordinate={coordinates[0]} animationMode="none" />
          <Mapbox.ShapeSource id={`ig-route-${templateId}`} shape={ride.route_geojson}>
            <Mapbox.LineLayer id={`ig-route-line-${templateId}`} style={{ lineColor: palette.danger, lineWidth: 4, lineBlur: 1 }} />
          </Mapbox.ShapeSource>
        </Mapbox.MapView>
      ) : null}

      {/* Compact top-left overlay card */}
      <View
        style={{
          position: 'absolute',
          top: overlayTop,
          left: overlayLeft,
          width: overlayWidth,
          borderRadius: overlayBorderRadius,
          overflow: 'hidden',
        }}>
        <LinearGradient
          colors={['rgba(0,0,0,0.66)', 'rgba(0,0,0,0.42)']}
          style={{
            paddingHorizontal: overlayPadding,
            paddingVertical: overlayPadding,
            gap: overlayGap,
          }}>
          {/* Logo + brand */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: width * 0.012 }}>
            <Image
              source={require('@/assets/images/logo.png')}
              style={{ width: width * 0.045, height: width * 0.045, resizeMode: 'contain' }}
            />
            <AppText
              variant="brand"
              style={{
                color: '#FFFFFF',
                fontSize: width * 0.034,
                lineHeight: width * 0.038,
                letterSpacing: width * 0.006,
              }}>
              KURBADA
            </AppText>
          </View>

          {/* Title */}
          <AppText
            variant="label"
            numberOfLines={1}
            style={{
              color: 'rgba(255,255,255,0.7)',
              fontSize: width * 0.024,
              lineHeight: width * 0.028,
              letterSpacing: width * 0.001,
            }}>
            {getRideStoryTitle(ride)}
          </AppText>

          {/* Primary metric */}
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: width * 0.01 }}>
            <AppText
              variant="heroMetric"
              numberOfLines={1}
              style={{
                color: accentPrimary ? palette.danger : '#FFFFFF',
                fontSize: width * 0.09,
                lineHeight: width * 0.098,
                paddingTop: width * 0.004,
              }}>
              {primary.value}
            </AppText>
            {primary.unit ? (
              <AppText
                variant="label"
                style={{
                  color: '#FFFFFF',
                  fontSize: width * 0.032,
                  lineHeight: width * 0.036,
                  marginBottom: width * 0.012,
                }}>
                {primary.unit}
              </AppText>
            ) : null}
          </View>

          {/* Small stats row */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: width * 0.024 }}>
            <MiniStat label="DISTANCE" value={`${ride.distance_km.toFixed(1)} KM`} width={width} />
            <MiniStat label="TOP SPEED" value={`${ride.max_speed_kmh.toFixed(0)} KM/H`} width={width} />
            <MiniStat label="MAX LEAN" value={`${(ride.max_lean_angle_deg ?? 0).toFixed(0)}°`} width={width} accent />
          </View>
        </LinearGradient>
      </View>
    </View>
  );
});
