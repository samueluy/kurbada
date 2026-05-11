import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { GlassCard } from '@/components/ui/glass-card';
import { palette } from '@/constants/theme';
import type { RideWindow } from '@/hooks/use-weather-window';

export function WeatherWindowCard({ window }: { window: RideWindow | null | undefined }) {
  return (
    <GlassCard style={{ padding: 18, borderRadius: 18, gap: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <AppText variant="eyebrow">NEXT CLEAR RIDE WINDOW</AppText>
        <Ionicons name="partly-sunny-outline" size={18} color={palette.lime} />
      </View>
      {window ? (
        <>
          <AppText variant="title" style={{ fontSize: 20 }}>
            {window.startLabel} — {window.endLabel}
          </AppText>
          <AppText variant="meta" style={{ color: palette.textSecondary }}>
            {window.hours}h of low rain probability. Good time to gear up.
          </AppText>
        </>
      ) : (
        <AppText variant="meta" style={{ color: palette.textSecondary }}>
          No clear 2-hour window in the next 48 hours. Stay dry.
        </AppText>
      )}
    </GlassCard>
  );
}
