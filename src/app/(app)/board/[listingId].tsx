import { File, Paths } from 'expo-file-system';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppScrollScreen } from '@/components/ui/app-screen';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { SectionHeader } from '@/components/ui/section-header';
import { RideListingCard } from '@/features/board/components/ride-listing-card';
import { Colors, palette } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useBoardFeed, useBoardMutations, useRideListingRsvps, useRsvpMutations } from '@/hooks/use-kurbada-data';
import { useUserProfile } from '@/hooks/use-user-access';
import { useBlockedUsersStore } from '@/store/blocked-users-store';

function formattedRideDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) + ' · ' + d.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
}

export default function LobbyDetailScreen() {
  const { session } = useAuth();
  const profile = useUserProfile(session?.user.id);
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ listingId?: string }>();
  const listingId = Array.isArray(params.listingId) ? params.listingId[0] : params.listingId;
  const listings = useBoardFeed(session?.user.id);
  const listing = useMemo(
    () => (listings.data ?? []).find((item) => item.id === listingId) ?? null,
    [listingId, listings.data],
  );
  const rsvps = useRideListingRsvps(listing?.id);
  const { setRsvp, cancelRsvp } = useRsvpMutations(session?.user.id);
  const { deleteRideListing, reportRideListing } = useBoardMutations(session?.user.id);
  const blockUser = useBlockedUsersStore((state) => state.blockUser);

  const isHost = listing?.host_user_id === session?.user.id;
  const myRsvp = useMemo(
    () => rsvps.data?.find((item) => item.user_id === session?.user.id),
    [rsvps.data, session?.user.id],
  );
  const goingCount = (rsvps.data ?? []).filter((item) => item.status === 'going').length;
  const maybeCount = (rsvps.data ?? []).filter((item) => item.status === 'maybe').length;

  const addToCalendar = async () => {
    if (!listing) return;
    try {
      const start = new Date(listing.ride_date);
      const end = new Date(start.getTime() + 3 * 60 * 60 * 1000);
      const fmt = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
      const uid = `kurbada-${listing.id}@kurbada.samueluy.com`;
      const ics = [
        'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Kurbada//Ride Lobby//EN',
        'BEGIN:VEVENT', `UID:${uid}`, `DTSTAMP:${fmt(new Date())}`,
        `DTSTART:${fmt(start)}`, `DTEND:${fmt(end)}`,
        `SUMMARY:Ride: ${listing.title?.trim() || listing.destination}`, `LOCATION:${listing.meetup_point}`,
        `DESCRIPTION:Host: ${listing.display_name}${listing.lobby_link ? `\\nLobby: ${listing.lobby_link}` : ''}`,
        'END:VEVENT', 'END:VCALENDAR',
      ].join('\r\n');
      const file = new File(Paths.cache, `kurbada-ride-${listing.id}.ics`);
      try { file.delete(); } catch { /* no-op */ }
      file.create();
      file.write(ics);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, { mimeType: 'text/calendar', dialogTitle: 'Add to Calendar', UTI: 'com.apple.ical.ics' });
      }
    } catch (error) {
      Alert.alert('Calendar error', error instanceof Error ? error.message : 'Could not save the event.');
    }
  };

  if (!listing) {
    return (
      <AppScrollScreen showWordmark={false}>
        <Button title="Back" variant="ghost" onPress={() => router.back()} />
        <GlassCard style={{ padding: 18 }}>
          <AppText variant="sectionTitle">Ride not found</AppText>
          <AppText variant="body" style={{ color: palette.textSecondary }}>
            This lobby may have been removed, hidden, or is no longer available on your board.
          </AppText>
        </GlassCard>
      </AppScrollScreen>
    );
  }

  return (
    <AppScrollScreen showWordmark={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <Pressable onPress={() => router.back()} style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.surfaceMuted }}>
          <Ionicons name="chevron-back" size={20} color={palette.text} />
        </Pressable>
        <View style={{ flex: 1, gap: 4 }}>
          <AppText variant="eyebrow">Lobby Detail</AppText>
          <AppText variant="screenTitle" style={{ fontSize: 28 }}>
            {listing.title?.trim() || listing.destination}
          </AppText>
        </View>
        <View style={{ width: 40, height: 40 }} />
      </View>

      <RideListingCard listing={listing} onPress={() => undefined} />

      <GlassCard style={{ padding: 18, gap: 12 }}>
        <View style={{ gap: 8 }}>
          <AppText variant="label" style={{ color: Colors.t3 }}>MEETUP DETAILS</AppText>
          <AppText variant="bodyBold">{listing.meetup_point}</AppText>
          <AppText variant="body" style={{ color: palette.textSecondary }}>{formattedRideDate(listing.ride_date)}</AppText>
          <AppText variant="body" style={{ color: palette.textSecondary }}>
            Hosted by {listing.display_name}
            {listing.is_verified_host ? ' · Verified host' : ''}
          </AppText>
          {listing.city ? <AppText variant="meta" style={{ color: palette.textTertiary }}>Area: {listing.city}</AppText> : null}
        </View>

        {isHost ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <Button title="Edit" variant="secondary" onPress={() => router.push({ pathname: '/(app)/board/create', params: { listingId: listing.id } })} />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                title="Delete"
                onPress={() => Alert.alert('Delete ride?', 'This ride listing will be removed from the board.', [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                      await deleteRideListing.mutateAsync(listing.id);
                      router.back();
                    },
                  },
                ])}
              />
            </View>
          </View>
        ) : (
          <Button
            title={myRsvp?.status === 'going' ? "You're Going" : 'Join this Ride'}
            onPress={async () => {
              if (!session?.user.id) {
                Alert.alert('Sign in required', 'You must be signed in to RSVP.');
                return;
              }
              if (myRsvp?.status === 'going') {
                await cancelRsvp.mutateAsync(listing.id).catch(() => undefined);
                return;
              }
              await setRsvp.mutateAsync({
                listingId: listing.id,
                status: 'going',
                displayName: profile.data?.display_name ?? 'Kurbada Rider',
              }).catch((error) => {
                Alert.alert('RSVP failed', error instanceof Error ? error.message : 'Please try again.');
              });
            }}
          />
        )}

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Button title="Calendar" variant="secondary" onPress={() => void addToCalendar()} />
          </View>
          {listing.lobby_platform !== 'none' && listing.lobby_link ? (
            <View style={{ flex: 1 }}>
              <Button
                title={listing.lobby_platform === 'telegram' ? 'Open Telegram' : 'Open Messenger'}
                variant="secondary"
                onPress={() => Linking.openURL(listing.lobby_link!).catch(() => Alert.alert('Could not open link', 'The lobby link may be invalid.'))}
              />
            </View>
          ) : null}
        </View>

        <AppText variant="meta" style={{ color: palette.textTertiary }}>
          {goingCount} going · {maybeCount} maybe
        </AppText>
      </GlassCard>

      <SectionHeader title="Riders" />
      <GlassCard style={{ padding: 18, gap: 10 }}>
        {(rsvps.data ?? []).length ? (
          (rsvps.data ?? []).map((rsvp) => (
            <View key={rsvp.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <AppText variant="body">{rsvp.display_name}</AppText>
              <AppText variant="meta" style={{ color: palette.textSecondary }}>
                {rsvp.status === 'going' ? 'Going' : 'Maybe'}
              </AppText>
            </View>
          ))
        ) : (
          <AppText variant="meta" style={{ color: palette.textSecondary }}>
            No RSVPs yet. Be the first rider in.
          </AppText>
        )}
      </GlassCard>

      {!isHost ? (
        <GlassCard style={{ padding: 18, gap: 10 }}>
          <Pressable
            onPress={() => Alert.alert('Report this ride?', 'It will be hidden from the board and flagged for review.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Report',
                style: 'destructive',
                onPress: async () => {
                  await reportRideListing.mutateAsync(listing.id);
                  router.back();
                },
              },
            ])}>
            <AppText variant="body" style={{ color: palette.textSecondary }}>Report this ride</AppText>
          </Pressable>
          <View style={{ height: 0.5, backgroundColor: palette.border }} />
          <Pressable
            onPress={() => Alert.alert(`Block ${listing.display_name}?`, "You won't see their rides or posts.", [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Block',
                style: 'destructive',
                onPress: () => {
                  blockUser(listing.host_user_id);
                  router.back();
                },
              },
            ])}>
            <AppText variant="body" style={{ color: palette.danger }}>Block this host</AppText>
          </Pressable>
        </GlassCard>
      ) : null}

      <View style={{ height: insets.bottom + 16 }} />
    </AppScrollScreen>
  );
}
