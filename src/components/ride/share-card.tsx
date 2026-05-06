import { LinearGradient } from 'expo-linear-gradient';
import { forwardRef } from 'react';
import { ImageBackground, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { palette } from '@/constants/theme';
import type { RideRecord } from '@/types/domain';

export const ShareCard = forwardRef<View, { ride: RideRecord; photoUri?: string }>(function ShareCard(
  { ride, photoUri },
  ref,
) {
  return (
    <View
      ref={ref}
      collapsable={false}
      style={{
        width: 1080,
        height: 1080,
        overflow: 'hidden',
        borderRadius: 48,
        backgroundColor: palette.background,
      }}>
      <ImageBackground source={photoUri ? { uri: photoUri } : undefined} style={{ flex: 1 }} blurRadius={16}>
        <LinearGradient
          colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.72)']}
          style={{ flex: 1, padding: 64, justifyContent: 'space-between' }}>
          <View style={{ gap: 12 }}>
            <AppText variant="brand" style={{ color: '#fff', fontSize: 72, letterSpacing: 10 }}>
              KURBADA
            </AppText>
            <View style={{ width: 80, height: 4, backgroundColor: palette.danger }} />
          </View>

          <View style={{ gap: 16 }}>
            <AppText variant="heroMetric" style={{ color: '#fff', fontSize: 110 }}>
              {ride.distance_km.toFixed(1)} KM
            </AppText>
            <View style={{ flexDirection: 'row', gap: 18 }}>
              <AppText variant="largeMetric" style={{ color: '#fff', fontSize: 42 }}>
                TOP {ride.max_speed_kmh.toFixed(0)} KM/H
              </AppText>
              {ride.max_lean_angle_deg ? (
                <AppText variant="largeMetric" style={{ color: '#fff', fontSize: 42 }}>
                  MAX {ride.max_lean_angle_deg.toFixed(0)}°
                </AppText>
              ) : null}
            </View>
          </View>
        </LinearGradient>
      </ImageBackground>
    </View>
  );
});
