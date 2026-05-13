import { forwardRef } from 'react';
import { Image, View } from 'react-native';

import { radius } from '@/constants/theme';
import { getMapboxModule } from '@/lib/mapbox';
import { RideStoryOverlay, type StoryTextTone } from '@/components/ride/ride-story-overlay';
import type { RideStoryTemplateId } from '@/lib/ride-story';
import type { RideRecord } from '@/types/domain';

type IgStoryCanvasProps = {
  ride: RideRecord;
  photoUri?: string;
  templateId: RideStoryTemplateId;
  fuelPricePerLiter?: number;
  width?: number;
  hidden?: boolean;
  photoScale?: number;
  photoOffsetX?: number;
  photoOffsetY?: number;
  overlayScale?: number;
  overlayOffsetX?: number;
  overlayOffsetY?: number;
  textTone?: StoryTextTone;
};

export const ROUTE_STORY_COLOR_MAIN = '#7CE8FF';
export const ROUTE_STORY_COLOR_GLOW = 'rgba(124,232,255,0.32)';

export const IgStoryCanvas = forwardRef<View, IgStoryCanvasProps>(function IgStoryCanvas(
  {
    ride,
    photoUri,
    templateId,
    fuelPricePerLiter,
    width = 1080,
    hidden = false,
    photoScale = 1.3,
    photoOffsetX = 0,
    photoOffsetY = -40,
    overlayScale = 1,
    overlayOffsetX = 0,
    overlayOffsetY = 0,
    textTone = 'light',
  },
  ref,
) {
  const Mapbox = getMapboxModule();
  const routeGeoJson = ride.route_preview_geojson ?? ride.route_geojson;
  const coordinates = routeGeoJson?.geometry?.coordinates as [number, number][] | undefined;
  const showMap = Boolean(!hidden && Mapbox && coordinates?.length);
  const height = Math.round(width * (1920 / 1080));
  const forceRouteBackground = templateId === 'route_stats';
  const showPhoto = Boolean(photoUri) && !forceRouteBackground;

  return (
    <View
      ref={ref}
      collapsable={false}
      style={{
        width,
        height,
        overflow: 'hidden',
        backgroundColor: '#0D0D0D',
        borderRadius: hidden ? 0 : radius.xl,
      }}>
      {showPhoto ? (
        <Image
          source={{ uri: photoUri }}
          style={{
            position: 'absolute',
            inset: 0,
            width,
            height,
            transform: [
              { scale: photoScale },
              { translateX: photoOffsetX },
              { translateY: photoOffsetY },
            ],
          }}
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
          zoomEnabled={false}
          rotateEnabled={false}
          pitchEnabled={false}>
          {ride.route_bounds ? (
            <Mapbox.Camera
              bounds={{
                ne: [ride.route_bounds.maxLng, ride.route_bounds.maxLat],
                sw: [ride.route_bounds.minLng, ride.route_bounds.minLat],
              }}
              padding={{
                paddingTop: Math.round(width * 0.12),
                paddingBottom: Math.round(width * 0.12),
                paddingLeft: Math.round(width * 0.08),
                paddingRight: Math.round(width * 0.08),
              }}
              animationMode="none"
            />
          ) : (
            <Mapbox.Camera zoomLevel={10} centerCoordinate={coordinates[0]} animationMode="none" />
          )}
          <Mapbox.ShapeSource id={`ig-route-${templateId}`} shape={routeGeoJson}>
            <Mapbox.LineLayer
              id={`ig-route-line-glow-${templateId}`}
              style={{
                lineColor: ROUTE_STORY_COLOR_GLOW,
                lineWidth: 10,
                lineBlur: 1.8,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            <Mapbox.LineLayer
              id={`ig-route-line-${templateId}`}
              style={{
                lineColor: ROUTE_STORY_COLOR_MAIN,
                lineWidth: 4.5,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </Mapbox.ShapeSource>
        </Mapbox.MapView>
      ) : null}
      <View
        style={{
          position: 'absolute',
          inset: 0,
          transform: [
            { translateX: overlayOffsetX },
            { translateY: overlayOffsetY },
            { scale: overlayScale },
          ],
        }}>
        <RideStoryOverlay
          ride={ride}
          templateId={templateId}
          fuelPricePerLiter={fuelPricePerLiter}
          width={width}
          textTone={textTone}
        />
      </View>
    </View>
  );
});
