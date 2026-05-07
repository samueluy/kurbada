import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { palette } from '@/constants/theme';
import type { WeatherData } from '@/types/domain';

function formatTime(iso: string) {
  if (!iso) return '--:--';
  return new Date(iso).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export function WeatherWidget({ weather, isError }: { weather?: WeatherData | null; isError?: boolean }) {
  const [expanded, setExpanded] = useState(false);

  if (isError) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Ionicons name="cloud-offline-outline" size={16} color={palette.textSecondary} />
        <AppText variant="meta" style={{ color: palette.textSecondary, fontSize: 14 }}>--°</AppText>
      </View>
    );
  }

  if (!weather) {
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Ionicons name="cloudy-outline" size={16} color={palette.textSecondary} />
        <AppText variant="meta" style={{ color: palette.textSecondary, fontSize: 14 }}>--°</AppText>
      </View>
    );
  }

  return (
    <View>
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Ionicons name={weather.weatherIcon as any} size={16} color={palette.textSecondary} />
        <AppText variant="meta" style={{ color: palette.text, fontSize: 14 }}>
          {weather.temperature}°
        </AppText>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={12} color={palette.textTertiary} />
      </Pressable>

      {expanded ? (
        <>
          <Pressable
            onPress={() => setExpanded(false)}
            style={{ position: 'absolute', top: -100, left: -300, right: 0, bottom: -600, zIndex: 99 }}
          />
          <View style={{
            position: 'absolute',
            top: 36,
            right: 0,
            zIndex: 100,
            width: 180,
            backgroundColor: '#1E1E1E',
            borderRadius: 14,
            borderWidth: 0.5,
            borderColor: palette.border,
            padding: 14,
            gap: 10,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name={weather.weatherIcon as any} size={18} color={palette.text} />
              <AppText variant="bodyBold" style={{ fontSize: 14 }}>{weather.weatherLabel}</AppText>
            </View>

            <View style={{ height: 0.5, backgroundColor: palette.border }} />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1, gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="sunny-outline" size={12} color={palette.textSecondary} />
                  <AppText variant="meta" style={{ color: palette.textSecondary, fontSize: 12 }}>Sunrise</AppText>
                </View>
                <AppText variant="bodyBold" style={{ fontSize: 12, color: palette.text }}>{formatTime(weather.sunrise)}</AppText>
              </View>
              <View style={{ flex: 1, gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="moon-outline" size={12} color={palette.textSecondary} />
                  <AppText variant="meta" style={{ color: palette.textSecondary, fontSize: 12 }}>Sunset</AppText>
                </View>
                <AppText variant="bodyBold" style={{ fontSize: 12, color: palette.text }}>{formatTime(weather.sunset)}</AppText>
              </View>
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1, gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="water-outline" size={12} color={palette.textSecondary} />
                  <AppText variant="meta" style={{ color: palette.textSecondary, fontSize: 12 }}>Rain</AppText>
                </View>
                <AppText variant="bodyBold" style={{ fontSize: 12, color: palette.text }}>{weather.precipProb}%</AppText>
              </View>
              <View style={{ flex: 1, gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="speedometer-outline" size={12} color={palette.textSecondary} />
                  <AppText variant="meta" style={{ color: palette.textSecondary, fontSize: 12 }}>Wind</AppText>
                </View>
                <AppText variant="bodyBold" style={{ fontSize: 12, color: palette.text }}>{weather.windSpeed} km/h</AppText>
              </View>
            </View>

            <View style={{ height: 0.5, backgroundColor: palette.border }} />

            <AppText variant="meta" style={{ color: palette.textTertiary, fontSize: 13, textAlign: 'center' }}>
              {weather.tempMin}° / {weather.tempMax}°
            </AppText>
          </View>
        </>
      ) : null}
    </View>
  );
}
