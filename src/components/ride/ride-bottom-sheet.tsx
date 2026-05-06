import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useMemo, useRef } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { GlassCard } from '@/components/ui/glass-card';
import { RouteMapPreview } from '@/components/ride/route-map-preview';

export function RideBottomSheet({ routeGeoJson }: { routeGeoJson?: GeoJSON.Feature<GeoJSON.LineString> }) {
  const ref = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['18%', '40%', '72%'], []);

  return (
    <BottomSheet
      ref={ref}
      index={0}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      backgroundStyle={{ backgroundColor: '#0D0D0D', borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)' }}
      handleIndicatorStyle={{ backgroundColor: 'rgba(255,255,255,0.22)' }}>
      <BottomSheetScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, gap: 12 }}>
        <GlassCard style={{ gap: 6, padding: 16 }}>
          <AppText variant="bodyBold">Altitude</AppText>
          <AppText variant="meta">Altitude chart placeholder for the current ride.</AppText>
        </GlassCard>
        <GlassCard style={{ gap: 6, padding: 16 }}>
          <AppText variant="bodyBold">G-Force</AppText>
          <AppText variant="meta">Impact graph preview for ride review and crash context.</AppText>
        </GlassCard>
        <View style={{ height: 220 }}>
          <RouteMapPreview routeGeoJson={routeGeoJson} />
        </View>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}
