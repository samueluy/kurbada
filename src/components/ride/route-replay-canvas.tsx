import { useEffect, useMemo, useState } from 'react';
import { Platform, View } from 'react-native';

import { RideStoryOverlay, type StoryTextTone } from '@/components/ride/ride-story-overlay';
import { AppText } from '@/components/ui/app-text';
import { GlassCard } from '@/components/ui/glass-card';
import { palette, radius } from '@/constants/theme';
import { getMapboxModule } from '@/lib/mapbox';
import {
  buildPartialRouteFeature,
  buildReplayPointFeature,
  getReplayCameraState,
  getReplayRouteCoordinates,
} from '@/lib/route-replay';
import type { RideStoryTemplateId } from '@/lib/ride-story';
import type { RideRecord } from '@/types/domain';

export function RouteReplayCanvas({
  ride,
  templateId,
  fuelPricePerLiter,
  width = 1080,
  hidden = false,
  progress,
  textTone = 'light',
}: {
  ride: RideRecord;
  templateId: RideStoryTemplateId;
  fuelPricePerLiter?: number;
  width?: number;
  hidden?: boolean;
  progress?: number;
  textTone?: StoryTextTone;
}) {
  const Mapbox = getMapboxModule();
  const height = Math.round(width * (1920 / 1080));
  const coordinates = useMemo(() => getReplayRouteCoordinates(ride), [ride]);
  const [previewProgress, setPreviewProgress] = useState(0);

  useEffect(() => {
    if (typeof progress === 'number') {
      return;
    }

    let frameId = 0;
    let mounted = true;
    const startedAt = Date.now();
    const loop = () => {
      if (!mounted) return;
      const elapsed = (Date.now() - startedAt) % 8000;
      setPreviewProgress(elapsed / 8000);
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);

    return () => {
      mounted = false;
      if (frameId) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [progress]);

  const effectiveProgress = typeof progress === 'number' ? progress : previewProgress;
  const routeFeature = useMemo(
    () => buildPartialRouteFeature(coordinates, effectiveProgress),
    [coordinates, effectiveProgress],
  );
  const pointFeature = useMemo(
    () => buildReplayPointFeature(coordinates, effectiveProgress),
    [coordinates, effectiveProgress],
  );
  const cameraState = useMemo(
    () => getReplayCameraState({ ride, points: coordinates, width, progress: effectiveProgress }),
    [coordinates, effectiveProgress, ride, width],
  );

  if (Platform.OS === 'web' || !Mapbox || coordinates.length < 2 || !cameraState) {
    return (
      <GlassCard style={{ width, height, justifyContent: 'center', alignItems: 'center', gap: 8, padding: 20 }}>
        <AppText variant="label">Route replay</AppText>
        <AppText variant="bodyBold">{Mapbox ? 'Replay unavailable' : 'Native map standby'}</AppText>
        <AppText variant="caption" style={{ textAlign: 'center', color: palette.textSecondary }}>
          {Mapbox
            ? 'This ride needs a longer route before Kurbada can animate a reel-ready replay.'
            : 'Route replay export becomes available in a native build with Mapbox enabled.'}
        </AppText>
      </GlassCard>
    );
  }

  return (
    <View
      collapsable={false}
      style={{
        width,
        height,
        overflow: 'hidden',
        backgroundColor: '#0D0D0D',
        borderRadius: hidden ? 0 : radius.xl,
      }}>
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
        {cameraState.mode === 'bounds' ? (
          <Mapbox.Camera
            bounds={{
              ne: [cameraState.bounds.maxLng, cameraState.bounds.maxLat],
              sw: [cameraState.bounds.minLng, cameraState.bounds.minLat],
            }}
            padding={cameraState.padding}
            pitch={cameraState.pitch}
            heading={cameraState.heading}
            animationMode="none"
          />
        ) : (
          <Mapbox.Camera
            centerCoordinate={cameraState.centerCoordinate}
            zoomLevel={cameraState.zoomLevel}
            pitch={cameraState.pitch}
            heading={cameraState.heading}
            animationMode="none"
          />
        )}

        <Mapbox.ShapeSource
          id="route-replay-base"
          shape={{
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates },
          }}>
          <Mapbox.LineLayer
            id="route-replay-base-line"
            style={{
              lineColor: 'rgba(255,255,255,0.2)',
              lineWidth: 5,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        </Mapbox.ShapeSource>

        {routeFeature ? (
          <Mapbox.ShapeSource id="route-replay-active" shape={routeFeature}>
            <Mapbox.LineLayer
              id="route-replay-active-glow"
              style={{
                lineColor: 'rgba(124,232,255,0.34)',
                lineWidth: 12,
                lineBlur: 1.8,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            <Mapbox.LineLayer
              id="route-replay-active-line"
              style={{
                lineColor: '#7CE8FF',
                lineWidth: 5.5,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </Mapbox.ShapeSource>
        ) : null}

        {pointFeature ? (
          <Mapbox.ShapeSource id="route-replay-point" shape={pointFeature}>
            <Mapbox.CircleLayer
              id="route-replay-point-glow"
              style={{
                circleColor: 'rgba(124,232,255,0.28)',
                circleRadius: 14,
              }}
            />
            <Mapbox.CircleLayer
              id="route-replay-point-core"
              style={{
                circleColor: '#FFFFFF',
                circleRadius: 6,
                circleStrokeWidth: 2,
                circleStrokeColor: '#7CE8FF',
              }}
            />
          </Mapbox.ShapeSource>
        ) : null}
      </Mapbox.MapView>

      <View
        style={{
          position: 'absolute',
          inset: 0,
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
}
