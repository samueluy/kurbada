import { Ionicons } from '@expo/vector-icons';
import { useCallback, useRef, useState } from 'react';
import { Dimensions, Modal, Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { palette } from '@/constants/theme';
import type { WeatherData } from '@/types/domain';

function formatTime(iso: string) {
  if (!iso) return '--:--';
  return new Date(iso).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export function WeatherWidget({ weather, isError }: { weather?: WeatherData | null; isError?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 56, left: Math.max(16, Dimensions.get('window').width - 196) });
  const triggerRef = useRef<View>(null);

  const toggleExpanded = useCallback(() => {
    if (expanded) {
      setExpanded(false);
      return;
    }

    requestAnimationFrame(() => {
      triggerRef.current?.measureInWindow((x, y, width, height) => {
        const screenWidth = Dimensions.get('window').width;
        const cardWidth = 180;
        const left = Math.min(
          Math.max(16, x + width - cardWidth),
          Math.max(16, screenWidth - cardWidth - 16),
        );

        setMenuPosition({
          top: y + height + 8,
          left,
        });
        setExpanded(true);
      });
    });
  }, [expanded]);

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
      <View ref={triggerRef} collapsable={false}>
        <Pressable
          onPress={toggleExpanded}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name={weather.weatherIcon as any} size={16} color={palette.textSecondary} />
          <AppText variant="meta" style={{ color: palette.text, fontSize: 14 }}>
            {weather.temperature}°
          </AppText>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={12} color={palette.textTertiary} />
        </Pressable>
      </View>

      <Modal
        visible={expanded}
        transparent
        animationType="fade"
        onRequestClose={() => setExpanded(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.08)' }} onPress={() => setExpanded(false)}>
          <Pressable
            onPress={() => undefined}
            style={{
              position: 'absolute',
              top: menuPosition.top,
              left: menuPosition.left,
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
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
