import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { palette, radius } from '@/constants/theme';
import { formatModeLabel } from '@/lib/format';
import type { RideRecord } from '@/types/domain';

export function RideMapThumbnail({ ride }: { ride: RideRecord }) {
  return (
    <View
      style={{
        height: 110,
        borderRadius: radius.md,
        overflow: 'hidden',
        backgroundColor: '#0D1B2A',
      }}>
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 }}>
        <AppText variant="meta" style={{ color: '#FFFFFF', textAlign: 'center' }}>
          Route preview opens in ride summary
        </AppText>
      </View>

      <View
        style={{
          position: 'absolute',
          left: 10,
          bottom: 10,
          backgroundColor: palette.surfaceMuted,
          borderRadius: radius.xs,
          paddingHorizontal: 8,
          paddingVertical: 3,
        }}>
        <AppText variant="label" style={{ color: palette.textSecondary, letterSpacing: 1 }}>
          {formatModeLabel(ride.mode)}
        </AppText>
      </View>
    </View>
  );
}
