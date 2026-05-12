import { forwardRef } from 'react';
import { Image, View, type TextStyle } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { palette, radius } from '@/constants/theme';
import { getMapboxModule } from '@/lib/mapbox';
import {
  getRideStoryPrimaryValue,
  getRideStoryTemplate,
  getRideStoryTitle,
  isAccentTemplate,
  type RideStoryLayout,
  type RideStoryTemplateId,
} from '@/lib/ride-story';
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
};

const shadow: TextStyle = {
  textShadowColor: 'rgba(0,0,0,0.7)',
  textShadowOffset: { width: 0, height: 2 },
  textShadowRadius: 6,
};

function MiniStat({
  label,
  value,
  width,
  accent = false,
  align = 'left',
}: {
  label: string;
  value: string;
  width: number;
  accent?: boolean;
  align?: 'left' | 'center' | 'right';
}) {
  return (
    <View
      style={{
        gap: width * 0.004,
        alignItems: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start',
      }}>
      <AppText
        variant="label"
        style={[
          shadow,
          {
            color: 'rgba(255,255,255,0.75)',
            fontSize: width * 0.022,
            lineHeight: width * 0.026,
            textAlign: align,
          },
        ]}>
        {label}
      </AppText>
      <AppText
        variant="label"
        style={[
          shadow,
          {
            color: accent ? palette.danger : '#FFFFFF',
            fontSize: width * 0.032,
            lineHeight: width * 0.036,
            textAlign: align,
          },
        ]}>
        {value}
      </AppText>
    </View>
  );
}

function BrandMark({ width, align = 'left' }: { width: number; align?: 'left' | 'center' | 'right' }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: width * 0.012,
        justifyContent:
          align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start',
      }}>
      <Image
        source={require('@/assets/images/logo-white-transparent.png')}
        style={{ width: width * 0.045, height: width * 0.045, resizeMode: 'contain' }}
      />
      <AppText
        variant="brand"
        style={[
          shadow,
          {
            color: '#FFFFFF',
            fontSize: width * 0.034,
            lineHeight: width * 0.038,
            letterSpacing: width * 0.006,
          },
        ]}>
        KURBADA
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
    photoScale = 1.3,
    photoOffsetX = 0,
    photoOffsetY = -40,
    overlayScale = 1,
    overlayOffsetX = 0,
    overlayOffsetY = 0,
  },
  ref,
) {
  const Mapbox = getMapboxModule();
  const coordinates = ride.route_geojson?.geometry.coordinates as [number, number][] | undefined;
  const showMap = Boolean(!hidden && Mapbox && coordinates?.length);
  const height = Math.round(width * (1920 / 1080));
  const template = getRideStoryTemplate(templateId);
  const layout: RideStoryLayout = template.layout;
  const primary = getRideStoryPrimaryValue(ride, templateId, fuelPricePerLiter);
  const accentPrimary = isAccentTemplate(templateId);
  const primaryColor = accentPrimary ? palette.danger : '#FFFFFF';
  const title = getRideStoryTitle(ride);
  const showPhoto = Boolean(photoUri);

  const miniStats = (
    <>
      <MiniStat label="DISTANCE" value={`${ride.distance_km.toFixed(1)} KM`} width={width} />
      <MiniStat label="TOP SPEED" value={`${ride.max_speed_kmh.toFixed(0)} KM/H`} width={width} />
      <MiniStat
        label="AVG SPEED"
        value={`${ride.avg_speed_kmh.toFixed(0)} KM/H`}
        width={width}
      />
    </>
  );

  const overlay = (() => {
    switch (layout) {
      case 'corner-tl':
        return (
          <View
            style={{
              position: 'absolute',
              top: width * 0.12,
              left: width * 0.06,
              width: width * 0.46,
              gap: width * 0.016,
            }}>
            <BrandMark width={width} />
            <AppText
              variant="label"
              numberOfLines={1}
              style={[
                shadow,
                {
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: width * 0.024,
                  lineHeight: width * 0.028,
                },
              ]}>
              {title}
            </AppText>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: width * 0.01 }}>
              <AppText
                variant="heroMetric"
                numberOfLines={1}
                style={[
                  shadow,
                  { color: primaryColor, fontSize: width * 0.1, lineHeight: width * 0.105 },
                ]}>
                {primary.value}
              </AppText>
              {primary.unit ? (
                <AppText
                  variant="label"
                  style={[
                    shadow,
                    {
                      color: '#FFFFFF',
                      fontSize: width * 0.032,
                      lineHeight: width * 0.036,
                      marginBottom: width * 0.012,
                    },
                  ]}>
                  {primary.unit}
                </AppText>
              ) : null}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: width * 0.024 }}>
              {miniStats}
            </View>
          </View>
        );
      case 'corner-tr':
        return (
          <View
            style={{
              position: 'absolute',
              top: width * 0.12,
              right: width * 0.06,
              width: width * 0.46,
              gap: width * 0.016,
              alignItems: 'flex-end',
            }}>
            <BrandMark width={width} align="right" />
            <AppText
              variant="label"
              numberOfLines={1}
              style={[
                shadow,
                { color: 'rgba(255,255,255,0.8)', fontSize: width * 0.024, textAlign: 'right' },
              ]}>
              {title}
            </AppText>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: width * 0.01 }}>
              <AppText
                variant="heroMetric"
                numberOfLines={1}
                style={[
                  shadow,
                  {
                    color: primaryColor,
                    fontSize: width * 0.11,
                    lineHeight: width * 0.115,
                    textAlign: 'right',
                  },
                ]}>
                {primary.value}
              </AppText>
              {primary.unit ? (
                <AppText
                  variant="label"
                  style={[
                    shadow,
                    {
                      color: '#FFFFFF',
                      fontSize: width * 0.032,
                      marginBottom: width * 0.012,
                    },
                  ]}>
                  {primary.unit}
                </AppText>
              ) : null}
            </View>
            <AppText
              variant="label"
              numberOfLines={2}
              style={[
                shadow,
                {
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: width * 0.022,
                  textAlign: 'right',
                  maxWidth: width * 0.44,
                },
              ]}>
              {primary.subtitle}
            </AppText>
          </View>
        );
      case 'center':
        return (
          <View
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 0,
              right: 0,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: width * 0.08,
              gap: width * 0.02,
            }}>
            <BrandMark width={width} align="center" />
            <AppText
              variant="label"
              style={[
                shadow,
                {
                  color: 'rgba(255,255,255,0.75)',
                  fontSize: width * 0.026,
                  letterSpacing: width * 0.003,
                },
              ]}>
              {title}
            </AppText>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: width * 0.01 }}>
              <AppText
                variant="heroMetric"
                numberOfLines={1}
                style={[
                  shadow,
                  {
                    color: primaryColor,
                    fontSize: width * 0.16,
                    lineHeight: width * 0.16,
                    textAlign: 'center',
                  },
                ]}>
                {primary.value}
              </AppText>
              {primary.unit ? (
                <AppText
                  variant="label"
                  style={[
                    shadow,
                    {
                      color: '#FFFFFF',
                      fontSize: width * 0.04,
                      marginBottom: width * 0.02,
                    },
                  ]}>
                  {primary.unit}
                </AppText>
              ) : null}
            </View>
            <AppText
              variant="label"
              numberOfLines={2}
              style={[
                shadow,
                {
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: width * 0.024,
                  textAlign: 'center',
                },
              ]}>
              {primary.subtitle}
            </AppText>
            <View style={{ flexDirection: 'row', gap: width * 0.06, marginTop: width * 0.02 }}>
              {miniStats}
            </View>
          </View>
        );
      case 'bottom-band':
        return (
          <>
            <View
              style={{
                position: 'absolute',
                top: width * 0.08,
                left: 0,
                right: 0,
                alignItems: 'center',
              }}>
              <BrandMark width={width} align="center" />
            </View>
            <View
              style={{
                position: 'absolute',
                bottom: width * 0.1,
                left: width * 0.06,
                right: width * 0.06,
                gap: width * 0.02,
              }}>
              <AppText
                variant="label"
                style={[
                  shadow,
                  {
                    color: 'rgba(255,255,255,0.75)',
                    fontSize: width * 0.024,
                    letterSpacing: width * 0.003,
                    textAlign: 'center',
                  },
                ]}>
                {title.toUpperCase()}
              </AppText>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'flex-end',
                  gap: width * 0.02,
                }}>
                <MiniStat
                  label="DISTANCE"
                  value={`${ride.distance_km.toFixed(1)} KM`}
                  width={width}
                />
                <MiniStat
                  label="TOP SPEED"
                  value={`${ride.max_speed_kmh.toFixed(0)} KM/H`}
                  width={width}
                  align="center"
                />
                <MiniStat
                  label="AVG SPEED"
                  value={`${ride.avg_speed_kmh.toFixed(0)} KM/H`}
                  width={width}
                  align="right"
                />
              </View>
            </View>
          </>
        );
      case 'left-rail':
        return (
          <View
            style={{
              position: 'absolute',
              top: width * 0.14,
              left: width * 0.05,
              bottom: width * 0.14,
              justifyContent: 'space-between',
            }}>
            <View
              style={{
                transform: [{ rotate: '-90deg' }],
                width: width * 0.4,
                marginLeft: -width * 0.15,
              }}>
              <AppText
                variant="brand"
                style={[
                  shadow,
                  {
                    color: '#FFFFFF',
                    fontSize: width * 0.05,
                    letterSpacing: width * 0.01,
                  },
                ]}>
                KURBADA
              </AppText>
            </View>
            <View style={{ gap: width * 0.02 }}>
              <AppText
                variant="label"
                style={[
                  shadow,
                  {
                    color: 'rgba(255,255,255,0.7)',
                    fontSize: width * 0.022,
                    letterSpacing: width * 0.002,
                  },
                ]}>
                {title.toUpperCase()}
              </AppText>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: width * 0.008 }}>
                <AppText
                  variant="heroMetric"
                  numberOfLines={1}
                  style={[
                    shadow,
                    {
                      color: primaryColor,
                      fontSize: width * 0.13,
                      lineHeight: width * 0.135,
                    },
                  ]}>
                  {primary.value}
                </AppText>
                {primary.unit ? (
                  <AppText
                    variant="label"
                    style={[
                      shadow,
                      {
                        color: '#FFFFFF',
                        fontSize: width * 0.036,
                        marginBottom: width * 0.014,
                      },
                    ]}>
                    {primary.unit}
                  </AppText>
                ) : null}
              </View>
              <View style={{ flexDirection: 'row', gap: width * 0.03 }}>{miniStats}</View>
            </View>
          </View>
        );
      default:
        return null;
    }
  })();

  return (
    <View
      ref={ref}
      collapsable={false}
      style={{
        width,
        height,
        overflow: 'hidden',
        backgroundColor: palette.background,
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
          zoomEnabled={false}>
          <Mapbox.Camera zoomLevel={10} centerCoordinate={coordinates[0]} animationMode="none" />
          <Mapbox.ShapeSource id={`ig-route-${templateId}`} shape={ride.route_geojson}>
            <Mapbox.LineLayer
              id={`ig-route-line-${templateId}`}
              style={{ lineColor: palette.danger, lineWidth: 4, lineBlur: 1 }}
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
        {overlay}
      </View>
    </View>
  );
});
