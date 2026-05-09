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

function StoryStat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <View style={{ gap: 4 }}>
      <AppText variant="label" style={{ color: palette.textTertiary, fontSize: 18 }}>
        {label}
      </AppText>
      <AppText variant="label" style={{ color: accent ? palette.danger : '#FFFFFF', fontSize: 34 }}>
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
  const accentValue = templateId === 'max_lean_hero' || templateId === 'fuel_burn';
  const showPhoto = Boolean(photoUri);

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

      <LinearGradient
        colors={showPhoto ? ['rgba(0,0,0,0.18)', 'rgba(0,0,0,0.88)'] : ['rgba(0,0,0,0.10)', 'rgba(0,0,0,0.92)']}
        style={{
          position: 'absolute',
          inset: 0,
          paddingHorizontal: width * 0.074,
          paddingTop: width * 0.11,
          paddingBottom: width * 0.11,
          justifyContent: 'space-between',
        }}>
        <View style={{ gap: width * 0.014 }}>
          <AppText
            variant="bodyBold"
            numberOfLines={2}
            style={{
              color: '#FFFFFF',
              fontSize: width * 0.04,
              lineHeight: width * 0.05,
              maxWidth: '78%',
              paddingTop: width * 0.004,
            }}>
            {getRideStoryTitle(ride)}
          </AppText>
        </View>

        <View style={{ gap: width * 0.04 }}>
          {templateId === 'route_stats' ? (
            <>
              <View style={{ gap: width * 0.01 }}>
                <AppText
                  variant="heroMetric"
                  style={{
                    color: '#FFFFFF',
                    fontSize: width * 0.11,
                    lineHeight: width * 0.125,
                    paddingTop: width * 0.008,
                  }}>
                  {ride.distance_km.toFixed(1)} KM
                </AppText>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: width * 0.034 }}>
                <StoryStat label="TOP SPEED" value={`${ride.max_speed_kmh.toFixed(0)} KM/H`} />
                <StoryStat label="AVG SPEED" value={`${ride.avg_speed_kmh.toFixed(0)} KM/H`} />
                <StoryStat label="LEAN" value={`${(ride.max_lean_angle_deg ?? 0).toFixed(0)}°`} accent />
              </View>
            </>
          ) : (
            <>
              <View style={{ gap: width * 0.012 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: width * 0.016, flexWrap: 'wrap' }}>
                  <AppText
                    variant="heroMetric"
                    style={{
                      color: accentValue ? palette.danger : '#FFFFFF',
                      fontSize: templateId === 'fuel_burn' ? width * 0.105 : width * 0.13,
                      lineHeight: templateId === 'fuel_burn' ? width * 0.12 : width * 0.145,
                      paddingTop: width * 0.008,
                    }}>
                    {primary.value}
                  </AppText>
                  {primary.unit ? (
                    <AppText variant="label" style={{ color: '#FFFFFF', fontSize: width * 0.042, marginBottom: width * 0.02 }}>
                      {primary.unit}
                    </AppText>
                  ) : null}
                </View>
              </View>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: width * 0.032 }}>
                <StoryStat label="DISTANCE" value={`${ride.distance_km.toFixed(1)} KM`} />
                <StoryStat label="TOP SPEED" value={`${ride.max_speed_kmh.toFixed(0)} KM/H`} />
                <StoryStat label="MAX LEAN" value={`${(ride.max_lean_angle_deg ?? 0).toFixed(0)}°`} accent />
              </View>
            </>
          )}
        </View>

        <View style={{ gap: width * 0.014 }}>
          <View style={{ width: '100%', height: 0.5, backgroundColor: 'rgba(255,255,255,0.14)' }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: width * 0.02 }}>
            <Image
              source={require('@/assets/images/logo.png')}
              style={{ width: width * 0.085, height: width * 0.085, resizeMode: 'contain' }}
            />
            <AppText variant="brand" style={{ color: '#FFFFFF', fontSize: width * 0.05, lineHeight: width * 0.056, letterSpacing: width * 0.01 }}>
              KURBADA
            </AppText>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
});
