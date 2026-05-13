import { CalendarDays, Flag, MapPin, Star, Users } from 'lucide-react-native';
import { memo } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';

import { GlassCard } from '@/components/ui/glass-card';
import { AppText } from '@/components/ui/app-text';
import { palette, radius } from '@/constants/theme';
import { getStaticPointMapUrl } from '@/lib/static-map';
import type { RideListing } from '@/types/domain';

const paceColors: Record<RideListing['pace'], { bg: string; fg: string }> = {
  chill: { bg: 'rgba(46,204,113,0.15)', fg: palette.success },
  moderate: { bg: 'rgba(243,156,18,0.15)', fg: '#F39C12' },
  sporty: { bg: palette.danger, fg: palette.text },
};

const paceLabels: Record<RideListing['pace'], string> = {
  chill: 'Chill',
  moderate: 'Sakto lang',
  sporty: 'Kamote',
};

function MapPreview({ listing }: { listing: RideListing }) {
  const coords = listing.meetup_coordinates;
  const mapUrl = getStaticPointMapUrl({
    coordinate: coords,
    width: 320,
    height: 120,
    zoom: 12.8,
  });

  return (
    <View
      style={{
        height: 120,
        borderRadius: radius.md,
        backgroundColor: '#0D1B2A',
        overflow: 'hidden',
      }}>
      {mapUrl ? (
        <Image
          source={{ uri: mapUrl }}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
        />
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 }}>
          <MapPin size={18} color={palette.danger} />
          <AppText variant="bodyBold" style={{ marginTop: 8 }}>
            Meetup map unavailable
          </AppText>
          <AppText variant="meta" style={{ color: palette.textSecondary, textAlign: 'center', marginTop: 4 }}>
            Add meetup coordinates to show the area and roads here.
          </AppText>
        </View>
      )}
      <View
        style={{
          position: 'absolute',
          left: 12,
          right: 12,
          bottom: 12,
          borderRadius: radius.md,
          paddingHorizontal: 12,
          paddingVertical: 10,
          backgroundColor: 'rgba(10,10,10,0.72)',
          gap: 4,
        }}>
        <AppText variant="label" style={{ color: palette.textTertiary }}>
          MEETUP PIN
        </AppText>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <AppText variant="bodyBold" numberOfLines={1} style={{ flex: 1 }}>
            {listing.meetup_point}
          </AppText>
          <AppText variant="meta" style={{ color: palette.textSecondary }}>
            {coords ? `${coords.lat.toFixed(3)}, ${coords.lng.toFixed(3)}` : 'No pin'}
          </AppText>
        </View>
      </View>
    </View>
  );
}

function PhotoStrip({ urls }: { urls: string[] }) {
  if (!urls?.length) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
      {urls.map((u, i) => (
        <Image
          key={`${u}-${i}`}
          source={{ uri: u }}
          style={{ width: 96, height: 72, borderRadius: radius.sm }}
          resizeMode="cover"
        />
      ))}
    </ScrollView>
  );
}

function RideListingCardImpl({
  listing,
  onPress,
  onReport,
}: {
  listing: RideListing;
  onPress?: () => void;
  onReport?: () => void;
}) {
  const goingCount = listing.rsvp_going_count ?? 0;
  const maybeCount = listing.rsvp_maybe_count ?? 0;
  const displayTitle = listing.title?.trim() || listing.destination;

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.94 : 1 }]}>
      <GlassCard style={{ padding: 14, gap: 12 }}>
        <MapPreview listing={listing} />
        {listing.photo_urls?.length ? <PhotoStrip urls={listing.photo_urls} /> : null}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <AppText variant="h2" numberOfLines={2} ellipsizeMode="tail">{displayTitle}</AppText>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <MapPin size={12} color={palette.textTertiary} />
              <AppText
                variant="meta"
                numberOfLines={1}
                ellipsizeMode="tail"
                style={{ color: palette.textSecondary, flex: 1, minWidth: 0 }}>
                {listing.destination}
                {listing.destination && listing.meetup_point ? ' · ' : ''}
                {listing.meetup_point}
                {listing.city ? ` · ${listing.city}` : ''}
              </AppText>
            </View>
          </View>
          <Pressable
            onPress={(event) => {
              event.stopPropagation?.();
              onReport?.();
            }}
            hitSlop={8}
            style={{ padding: 4, flexShrink: 0 }}
          >
            <Flag size={14} color={palette.textTertiary} />
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1, minWidth: 0 }}>
            <CalendarDays size={13} color={palette.textSecondary} />
            <AppText
              variant="meta"
              numberOfLines={1}
              ellipsizeMode="tail"
              style={{ color: palette.textSecondary, flexShrink: 1, minWidth: 0 }}>
              {new Date(listing.ride_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} · {new Date(listing.ride_date).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}
            </AppText>
          </View>
          <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.xs, backgroundColor: paceColors[listing.pace].bg, flexShrink: 0 }}>
            <AppText variant="label" style={{ color: paceColors[listing.pace].fg, letterSpacing: 0.8 }}>
              {paceLabels[listing.pace]}
            </AppText>
          </View>
          {goingCount + maybeCount > 0 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Users size={12} color={palette.textTertiary} />
              <AppText variant="meta" style={{ color: palette.textTertiary, fontSize: 12 }}>
                {goingCount} going{maybeCount ? ` · ${maybeCount} maybe` : ''}
              </AppText>
            </View>
          ) : null}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {listing.is_verified_host ? (
            <Star size={12} color="#F39C12" fill="#F39C12" />
          ) : null}
          <AppText
            variant="meta"
            numberOfLines={1}
            ellipsizeMode="tail"
            style={{ color: palette.textTertiary, fontSize: 12, flex: 1, minWidth: 0 }}>
            by {listing.display_name}
            {listing.is_verified_host ? ' · Verified host' : ''}
          </AppText>
        </View>
        <View style={{ height: 0.5, backgroundColor: palette.divider }} />
        <AppText variant="meta" numberOfLines={2} style={{ color: palette.textSecondary }}>
          Meet at {listing.meetup_point}. Ride pace: {paceLabels[listing.pace].toLowerCase()}. Tap for details and RSVP.
        </AppText>
      </GlassCard>
    </Pressable>
  );
}

export const RideListingCard = memo(RideListingCardImpl);
