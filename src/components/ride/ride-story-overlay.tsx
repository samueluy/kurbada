import { Image, View, type TextStyle } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { palette } from '@/constants/theme';
import {
  getRideStoryPrimaryValue,
  getRideStoryTemplate,
  getRideStoryTitle,
  isAccentTemplate,
  type RideStoryLayout,
  type RideStoryTemplateId,
} from '@/lib/ride-story';
import type { RideRecord } from '@/types/domain';

export type StoryTextTone = 'light' | 'dark';

type StoryTonePalette = {
  shadow: TextStyle;
  brandTint: string;
  primaryText: string;
  primaryMuted: string;
  secondaryText: string;
  unitText: string;
  accentText: string;
};

function getTonePalette(textTone: StoryTextTone): StoryTonePalette {
  if (textTone === 'dark') {
    return {
      shadow: {
        textShadowColor: 'rgba(255,255,255,0.6)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
      },
      brandTint: '#111111',
      primaryText: '#111111',
      primaryMuted: 'rgba(17,17,17,0.78)',
      secondaryText: 'rgba(17,17,17,0.88)',
      unitText: '#111111',
      accentText: palette.danger,
    };
  }

  return {
    shadow: {
      textShadowColor: 'rgba(0,0,0,0.7)',
      textShadowOffset: { width: 0, height: 2 },
      textShadowRadius: 6,
    },
    brandTint: '#FFFFFF',
    primaryText: '#FFFFFF',
    primaryMuted: 'rgba(255,255,255,0.75)',
    secondaryText: 'rgba(255,255,255,0.82)',
    unitText: '#FFFFFF',
    accentText: palette.danger,
  };
}

function MiniStat({
  label,
  value,
  width,
  tone,
  accent = false,
  align = 'left',
}: {
  label: string;
  value: string;
  width: number;
  tone: StoryTonePalette;
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
          tone.shadow,
          {
            color: tone.primaryMuted,
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
          tone.shadow,
          {
            color: accent ? tone.accentText : tone.primaryText,
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

function BrandMark({
  width,
  tone,
  align = 'left',
}: {
  width: number;
  tone: StoryTonePalette;
  align?: 'left' | 'center' | 'right';
}) {
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
        style={{
          width: width * 0.045,
          height: width * 0.045,
          resizeMode: 'contain',
          tintColor: tone.brandTint,
        }}
      />
      <AppText
        variant="brand"
        style={[
          tone.shadow,
          {
            color: tone.primaryText,
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

export function RideStoryOverlay({
  ride,
  templateId,
  fuelPricePerLiter,
  width,
  textTone = 'light',
}: {
  ride: RideRecord;
  templateId: RideStoryTemplateId;
  fuelPricePerLiter?: number;
  width: number;
  textTone?: StoryTextTone;
}) {
  const tone = getTonePalette(textTone);
  const template = getRideStoryTemplate(templateId);
  const layout: RideStoryLayout = template.layout;
  const primary = getRideStoryPrimaryValue(ride, templateId, fuelPricePerLiter);
  const accentPrimary = isAccentTemplate(templateId);
  const primaryColor = accentPrimary ? tone.accentText : tone.primaryText;
  const title = getRideStoryTitle(ride);

  const miniStats = (
    <>
      <MiniStat label="DISTANCE" value={`${ride.distance_km.toFixed(1)} KM`} width={width} tone={tone} />
      <MiniStat label="TOP SPEED" value={`${ride.max_speed_kmh.toFixed(0)} KM/H`} width={width} tone={tone} />
      <MiniStat label="AVG SPEED" value={`${ride.avg_speed_kmh.toFixed(0)} KM/H`} width={width} tone={tone} />
    </>
  );

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
          <BrandMark width={width} tone={tone} />
          <AppText
            variant="label"
            numberOfLines={1}
            style={[
              tone.shadow,
              {
                color: tone.secondaryText,
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
                tone.shadow,
                { color: primaryColor, fontSize: width * 0.1, lineHeight: width * 0.105 },
              ]}>
              {primary.value}
            </AppText>
            {primary.unit ? (
              <AppText
                variant="label"
                style={[
                  tone.shadow,
                  {
                    color: tone.unitText,
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
          <BrandMark width={width} tone={tone} align="right" />
          <AppText
            variant="label"
            numberOfLines={1}
            style={[
              tone.shadow,
              { color: tone.secondaryText, fontSize: width * 0.024, textAlign: 'right' },
            ]}>
            {title}
          </AppText>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: width * 0.01 }}>
            <AppText
              variant="heroMetric"
              numberOfLines={1}
              style={[
                tone.shadow,
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
                  tone.shadow,
                  {
                    color: tone.unitText,
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
              tone.shadow,
              {
                color: tone.secondaryText,
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
          <BrandMark width={width} tone={tone} align="center" />
          <AppText
            variant="label"
            style={[
              tone.shadow,
              {
                color: tone.primaryMuted,
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
                tone.shadow,
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
                  tone.shadow,
                  {
                    color: tone.unitText,
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
              tone.shadow,
              {
                color: tone.secondaryText,
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
            <BrandMark width={width} tone={tone} align="center" />
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
                tone.shadow,
                {
                  color: tone.primaryMuted,
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
              <MiniStat label="DISTANCE" value={`${ride.distance_km.toFixed(1)} KM`} width={width} tone={tone} />
              <MiniStat label="TOP SPEED" value={`${ride.max_speed_kmh.toFixed(0)} KM/H`} width={width} tone={tone} align="center" />
              <MiniStat label="AVG SPEED" value={`${ride.avg_speed_kmh.toFixed(0)} KM/H`} width={width} tone={tone} align="right" />
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
                tone.shadow,
                {
                  color: tone.primaryText,
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
                tone.shadow,
                {
                  color: tone.primaryMuted,
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
                  tone.shadow,
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
                    tone.shadow,
                    {
                      color: tone.unitText,
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
}
