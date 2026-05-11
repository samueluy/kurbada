import { File, Paths } from 'expo-file-system';
import * as Linking from 'expo-linking';
import * as Sharing from 'expo-sharing';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabTransition } from '@/components/navigation/tab-transition';
import { AppText } from '@/components/ui/app-text';
import { AppScreen } from '@/components/ui/app-screen';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { GlassCard } from '@/components/ui/glass-card';
import { SectionHeader } from '@/components/ui/section-header';
import { palette, radius } from '@/constants/theme';
import { RideListingCard } from '@/features/board/components/ride-listing-card';
import { useAuth } from '@/hooks/use-auth';
import { useBoardMutations, useRideListings, useRsvpMutations, useRideListingRsvps } from '@/hooks/use-kurbada-data';
import { useAppStore } from '@/store/app-store';
import { useBlockedUsersStore } from '@/store/blocked-users-store';
import type { RideListing } from '@/types/domain';

function SafetyDisclaimer() {
  return (
    <View style={{ flexDirection: 'row', gap: 8, padding: 12, backgroundColor: 'rgba(243,156,18,0.12)', borderRadius: radius.md, borderWidth: 0.5, borderColor: 'rgba(243,156,18,0.35)' }}>
      <Ionicons name="shield-checkmark-outline" size={18} color="#F39C12" />
      <View style={{ flex: 1, gap: 4 }}>
        <AppText variant="label" style={{ color: '#F39C12', letterSpacing: 0.6 }}>RIDE SAFE — COMMUNITY STANDARDS</AppText>
        <AppText variant="meta" style={{ color: palette.textSecondary, fontSize: 11, lineHeight: 16 }}>
          All listings follow the Kurbada Community Guidelines: helmet + gear required, obey traffic laws, no racing, stop every 60–90 min, ride at the pace of the slowest. Hosts are not rescue crews; every rider is responsible for their own safety.
        </AppText>
      </View>
    </View>
  );
}

function JoinLobbySheet({
  listing,
  onClose,
  onBlock,
  currentUserId,
  displayName,
}: {
  listing: RideListing;
  onClose: () => void;
  onBlock: (hostId: string) => void;
  currentUserId?: string;
  displayName?: string;
}) {
  const { setRsvp, cancelRsvp } = useRsvpMutations(currentUserId);
  const rsvps = useRideListingRsvps(listing.id);
  const myRsvp = useMemo(
    () => rsvps.data?.find((r) => r.user_id === currentUserId),
    [rsvps.data, currentUserId],
  );

  const addToCalendar = async () => {
    try {
      const start = new Date(listing.ride_date);
      const end = new Date(start.getTime() + 3 * 60 * 60 * 1000);
      const fmt = (d: Date) =>
        d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
      const uid = `kurbada-${listing.id}@kurbada.samueluy.com`;
      const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Kurbada//Ride Lobby//EN',
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${fmt(new Date())}`,
        `DTSTART:${fmt(start)}`,
        `DTEND:${fmt(end)}`,
        `SUMMARY:Ride: ${listing.destination}`,
        `LOCATION:${listing.meetup_point}`,
        `DESCRIPTION:Host: ${listing.display_name}\\nLobby: ${listing.lobby_link}`,
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n');

      const file = new File(Paths.cache, `kurbada-ride-${listing.id}.ics`);
      try { file.delete(); } catch { /* no-op */ }
      file.create();
      file.write(ics);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'text/calendar',
          dialogTitle: 'Add to Calendar',
          UTI: 'com.apple.ical.ics',
        });
      } else {
        Alert.alert('Not available', 'Sharing is not available on this device.');
      }
    } catch (error) {
      Alert.alert('Calendar error', error instanceof Error ? error.message : 'Could not save the event.');
    }
  };

  const handleRsvp = async (status: 'going' | 'maybe') => {
    if (!currentUserId || !displayName) {
      Alert.alert('Sign in required', 'You must be signed in to RSVP.');
      return;
    }
    try {
      await setRsvp.mutateAsync({ listingId: listing.id, status, displayName });
    } catch (error) {
      Alert.alert('RSVP failed', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const handleCancelRsvp = async () => {
    if (!currentUserId) return;
    await cancelRsvp.mutateAsync(listing.id).catch(() => undefined);
  };

  return (
    <GlassCard style={{ marginTop: 12, padding: 18, gap: 14 }}>
      <AppText variant="title" numberOfLines={2} ellipsizeMode="tail" style={{ fontSize: 18 }}>
        {listing.destination}
      </AppText>
      <AppText variant="meta" numberOfLines={2} ellipsizeMode="tail" style={{ color: palette.textSecondary }}>
        {listing.meetup_point} · {new Date(listing.ride_date).toLocaleString('en-PH', { dateStyle: 'full', timeStyle: 'short' })}
      </AppText>
      <AppText variant="meta" numberOfLines={1} ellipsizeMode="tail">
        Hosted by {listing.display_name}
        {listing.is_verified_host ? ' · ⭐ Verified' : ''}
      </AppText>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button
            title={myRsvp?.status === 'going' ? '✓ Going' : 'Going'}
            variant={myRsvp?.status === 'going' ? 'primary' : 'secondary'}
            onPress={() => handleRsvp('going')}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            title={myRsvp?.status === 'maybe' ? '✓ Maybe' : 'Maybe'}
            variant={myRsvp?.status === 'maybe' ? 'primary' : 'secondary'}
            onPress={() => handleRsvp('maybe')}
          />
        </View>
      </View>

      {myRsvp ? (
        <Button title="Cancel RSVP" variant="ghost" onPress={handleCancelRsvp} />
      ) : null}

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button title="Add to Calendar" variant="secondary" onPress={addToCalendar} />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            title="Open Lobby"
            variant="secondary"
            onPress={() => {
              Linking.openURL(listing.lobby_link).catch(() =>
                Alert.alert('Could not open link', 'The lobby link may be invalid.'),
              );
            }}
          />
        </View>
      </View>

      <Button
        title="Block this host"
        variant="ghost"
        onPress={() => {
          Alert.alert('Block this host?', 'You will no longer see their ride listings.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Block',
              style: 'destructive',
              onPress: () => {
                onBlock(listing.host_user_id);
                onClose();
              },
            },
          ]);
        }}
      />
      <Button title="Close" variant="ghost" onPress={onClose} />
    </GlassCard>
  );
}

export default function BoardTabScreen() {
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const listings = useRideListings(session?.user.id);
  const { reportRideListing } = useBoardMutations(session?.user.id);
  const [selectedListing, setSelectedListing] = useState<RideListing | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cityFilter, setCityFilter] = useState<string | null>(null);
  const blockedUserIds = useBlockedUsersStore((s) => s.blockedUserIds);
  const blockUser = useBlockedUsersStore((s) => s.blockUser);
  const hasSeenGuidelines = useAppStore((s) => s.hasSeenCommunityGuidelines);

  // Gate first lobby view behind community guidelines acknowledgement
  useEffect(() => {
    if (!hasSeenGuidelines) {
      router.push('/(app)/board/community-guidelines' as any);
    }
  }, [hasSeenGuidelines]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const refetch = (listings as { refetch?: () => Promise<unknown> }).refetch;
      await refetch?.();
    } finally {
      setIsRefreshing(false);
    }
  }, [listings]);

  const handleReport = useCallback(
    (id: string) => {
      Alert.alert('Report this ride?', 'It will be hidden from the board and flagged for review.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Report', style: 'destructive', onPress: () => reportRideListing.mutate(id) },
      ]);
    },
    [reportRideListing],
  );

  const availableCities = useMemo(() => {
    const cities = new Set<string>();
    (listings.data ?? []).forEach((l) => {
      if (l.city) cities.add(l.city);
    });
    return Array.from(cities).sort();
  }, [listings.data]);

  const filteredListings = useMemo(() => {
    let data = listings.data ?? [];
    // Filter out blocked users
    data = data.filter((l) => !blockedUserIds.includes(l.host_user_id));
    // Filter out auto-hidden listings
    data = data.filter((l) => !l.is_hidden);
    // City filter
    if (cityFilter) {
      data = data.filter((l) => l.city === cityFilter);
    }
    return data;
  }, [listings.data, blockedUserIds, cityFilter]);

  const renderItem = useCallback(
    ({ item }: { item: RideListing }) => (
      <RideListingCard
        listing={item}
        onPress={() => setSelectedListing(item)}
        onReport={() => handleReport(item.id)}
      />
    ),
    [handleReport],
  );

  return (
    <TabTransition>
      <AppScreen style={{ backgroundColor: palette.background }}>
        <FlatList
          data={filteredListings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 96, gap: 12 }}
          ListHeaderComponent={
            <View style={{ paddingTop: 8, gap: 12 }}>
              <SafetyDisclaimer />

              {availableCities.length > 0 ? (
                <View>
                  <AppText variant="label" style={{ color: palette.textTertiary, marginBottom: 6 }}>
                    NEAR ME
                  </AppText>
                  <FlatList
                    data={[null, ...availableCities]}
                    horizontal
                    keyExtractor={(item) => item ?? 'all'}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8 }}
                    renderItem={({ item }) => {
                      const label = item ?? 'All cities';
                      const active = cityFilter === item;
                      return (
                        <Pressable
                          onPress={() => setCityFilter(item)}
                          style={{
                            paddingHorizontal: 14,
                            paddingVertical: 8,
                            borderRadius: 999,
                            backgroundColor: active ? palette.text : 'rgba(255,255,255,0.06)',
                            borderWidth: 0.5,
                            borderColor: active ? palette.text : palette.border,
                          }}>
                          <AppText
                            variant="button"
                            style={{
                              fontSize: 12,
                              color: active ? palette.background : palette.textSecondary,
                            }}>
                            {label}
                          </AppText>
                        </Pressable>
                      );
                    }}
                  />
                </View>
              ) : null}

              <SectionHeader title="Upcoming" />
            </View>
          }
          renderItem={renderItem}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={palette.text}
              colors={[palette.danger]}
            />
          }
          ListEmptyComponent={
            <GlassCard style={{ padding: 18 }}>
              <EmptyState
                icon="radio-outline"
                title={cityFilter ? `No rides in ${cityFilter}` : 'No upcoming rides'}
                body={cityFilter ? 'Clear the filter or host your own ride here.' : 'Be the first to post a group ride.'}
              />
            </GlassCard>
          }
        />

        {selectedListing ? (
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: 32 }}>
            <JoinLobbySheet
              listing={selectedListing}
              onClose={() => setSelectedListing(null)}
              onBlock={blockUser}
              currentUserId={session?.user.id}
              displayName={session?.user.user_metadata.display_name ?? 'Kurbada Rider'}
            />
          </View>
        ) : null}

        <Pressable
          onPress={() => router.push('/(app)/board/create')}
          style={{
            position: 'absolute',
            bottom: insets.bottom + 22,
            right: 16,
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: '#C0392B',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#C0392B',
            shadowOpacity: 0.4,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
            elevation: 6,
          }}>
          <AppText variant="bodyBold" style={{ color: '#FFFFFF', fontSize: 24, lineHeight: 28 }}>
            +
          </AppText>
        </Pressable>
      </AppScreen>
    </TabTransition>
  );
}
