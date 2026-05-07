import { CalendarDays, Flag, MapPin } from 'lucide-react-native';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { GlassCard } from '@/components/ui/glass-card';
import { AppText } from '@/components/ui/app-text';
import { palette, radius } from '@/constants/theme';
import type { RideListing } from '@/types/domain';

const paceColors: Record<RideListing['pace'], { bg: string; fg: string }> = {
  chill: { bg: 'rgba(46,204,113,0.15)', fg: palette.success },
  moderate: { bg: 'rgba(243,156,18,0.15)', fg: '#F39C12' },
  sporty: { bg: palette.danger, fg: palette.text },
};

const paceLabels: Record<RideListing['pace'], string> = {
  chill: 'Chill',
  moderate: 'Moderate',
  sporty: 'Sporty',
};

export function RideListingCard({
  listing,
  onPress,
  onReport,
}: {
  listing: RideListing;
  onPress?: () => void;
  onReport?: () => void;
}) {
  const expanded = useSharedValue(0);

  const expandStyle = useAnimatedStyle(() => ({
    height: withTiming(expanded.value ? 80 : 0, { duration: 200 }),
    opacity: withTiming(expanded.value ? 1 : 0, { duration: 200 }),
    overflow: 'hidden' as const,
  }));

  const handlePress = () => {
    expanded.value = expanded.value ? 0 : 1;
    onPress?.();
  };

  return (
    <Pressable onPress={handlePress} style={({ pressed }) => [{ opacity: pressed ? 0.94 : 1 }]}>
      <GlassCard style={{ padding: 14, gap: 12 }}>
        <View style={{ height: 86, borderRadius: radius.md, backgroundColor: '#0D1B2A', justifyContent: 'center', alignItems: 'center' }}>
          <AppText variant="meta" style={{ color: palette.textSecondary }}>Native Mapbox preview appears in dev build</AppText>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, gap: 4 }}>
            <AppText variant="h2">{listing.destination}</AppText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <MapPin size={12} color={palette.textTertiary} />
              <AppText variant="meta" style={{ color: palette.textSecondary }}>
                {listing.meetup_point}
              </AppText>
            </View>
          </View>
          <Pressable
            onPress={() => onReport?.()}
            hitSlop={8}
            style={{ padding: 4 }}
          >
            <Flag size={14} color={palette.textTertiary} />
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <CalendarDays size={13} color={palette.textSecondary} />
            <AppText variant="meta" style={{ color: palette.textSecondary }}>
              {new Date(listing.ride_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} · {new Date(listing.ride_date).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}
            </AppText>
          </View>
          <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.xs, backgroundColor: paceColors[listing.pace].bg }}>
            <AppText variant="label" style={{ color: paceColors[listing.pace].fg, letterSpacing: 0.8 }}>
              {paceLabels[listing.pace]}
            </AppText>
          </View>
          <AppText variant="meta" style={{ color: palette.textTertiary, fontSize: 12 }}>
            by {listing.display_name}
          </AppText>
        </View>

        <Animated.View style={[expandStyle, { gap: 10 }]}>
          <View style={{ height: 0.5, backgroundColor: palette.divider }} />
          <AppText variant="meta" style={{ color: palette.textSecondary }}>
            Meet at {listing.meetup_point}. Ride pace: {paceLabels[listing.pace].toLowerCase()}. Join the lobby to coordinate.
          </AppText>
        </Animated.View>
      </GlassCard>
    </Pressable>
  );
}
