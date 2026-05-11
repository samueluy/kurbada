import { File, Paths } from 'expo-file-system';
import * as Linking from 'expo-linking';
import * as Sharing from 'expo-sharing';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, FlatList, Pressable, RefreshControl, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabTransition } from '@/components/navigation/tab-transition';
import { AppText } from '@/components/ui/app-text';
import { AppScreen } from '@/components/ui/app-screen';
import { EmptyState } from '@/components/ui/empty-state';
import { GlassCard } from '@/components/ui/glass-card';
import { SectionHeader } from '@/components/ui/section-header';
import { palette, radius } from '@/constants/theme';
import { RideListingCard } from '@/features/board/components/ride-listing-card';
import { useAuth } from '@/hooks/use-auth';
import { useBoardMutations, useRideListings, useRsvpMutations, useRideListingRsvps } from '@/hooks/use-kurbada-data';
import { useBlockedUsersStore } from '@/store/blocked-users-store';
import { useAppStore } from '@/store/app-store';
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

function formattedRideDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) + ' · ' + d.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
}

function JoinLobbySheet({
  listing,
  onClose,
  onBlock,
  onEdit,
  onDelete,
  onReport,
  currentUserId,
  displayName,
}: {
  listing: RideListing;
  onClose: () => void;
  onBlock: (hostId: string) => void;
  onEdit: (listing: RideListing) => void;
  onDelete: (listing: RideListing) => void;
  onReport: (listingId: string) => void;
  currentUserId?: string;
  displayName?: string;
}) {
  const { setRsvp, cancelRsvp } = useRsvpMutations(currentUserId);
  const rsvps = useRideListingRsvps(listing.id);
  const isHost = listing.host_user_id === currentUserId;
  const displayTitle = listing.title?.trim() || listing.destination;
  const myRsvp = useMemo(
    () => rsvps.data?.find((r) => r.user_id === currentUserId),
    [rsvps.data, currentUserId],
  );

  const goingCount = (rsvps.data ?? []).filter((r) => r.status === 'going').length;
  const maybeCount = (rsvps.data ?? []).filter((r) => r.status === 'maybe').length;
  const rsvpStatus = myRsvp?.status;

  const addToCalendar = async () => {
    try {
      const start = new Date(listing.ride_date);
      const end = new Date(start.getTime() + 3 * 60 * 60 * 1000);
      const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
      const uid = `kurbada-${listing.id}@kurbada.samueluy.com`;
      const ics = [
        'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Kurbada//Ride Lobby//EN',
        'BEGIN:VEVENT', `UID:${uid}`, `DTSTAMP:${fmt(new Date())}`,
        `DTSTART:${fmt(start)}`, `DTEND:${fmt(end)}`,
        `SUMMARY:Ride: ${displayTitle}`, `LOCATION:${listing.meetup_point}`,
        `DESCRIPTION:Host: ${listing.display_name}${listing.lobby_link ? `\\nLobby: ${listing.lobby_link}` : ''}`,
        'END:VEVENT', 'END:VCALENDAR',
      ].join('\r\n');
      const file = new File(Paths.cache, `kurbada-ride-${listing.id}.ics`);
      try { file.delete(); } catch { /* no-op */ }
      file.create();
      file.write(ics);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, { mimeType: 'text/calendar', dialogTitle: 'Add to Calendar', UTI: 'com.apple.ical.ics' });
      } else {
        Alert.alert('Not available', 'Sharing is not available on this device.');
      }
    } catch (error) {
      Alert.alert('Calendar error', error instanceof Error ? error.message : 'Could not save the event.');
    }
  };

  const handleRsvp = async () => {
    if (!currentUserId || !displayName) {
      Alert.alert('Sign in required', 'You must be signed in to RSVP.');
      return;
    }
    try {
      await setRsvp.mutateAsync({ listingId: listing.id, status: 'going', displayName });
    } catch (error) {
      Alert.alert('RSVP failed', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const handleCancelRsvp = async () => {
    if (!currentUserId) return;
    Alert.alert('Cancel RSVP?', 'You will be removed from the attendee list.', [
      { text: 'Stay', style: 'cancel' },
      { text: 'Cancel RSVP', style: 'destructive', onPress: () => cancelRsvp.mutateAsync(listing.id).catch(() => undefined) },
    ]);
  };

  const handleReport = () => {
    Alert.alert('Report this ride?', 'Our team will review it.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Report', style: 'destructive', onPress: () => { onReport(listing.id); onClose(); } },
    ]);
  };

  const handleBlock = () => {
    if (listing.host_user_id === currentUserId) {
      Alert.alert('Not available', 'You cannot block your own host profile.');
      return;
    }
    Alert.alert(`Block ${listing.display_name}?`, "You won't see their rides or posts.", [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Block', style: 'destructive', onPress: () => { onBlock(listing.host_user_id); onClose(); } },
    ]);
  };

  const lobbyLabel = listing.lobby_platform === 'telegram' ? 'Telegram' : 'Messenger';
  const lobbyIcon = listing.lobby_platform === 'telegram' ? 'send-outline' : ('chatbubble-outline' as any);

  return (
    <View style={{ backgroundColor: Colors.s1, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingBottom: 20 }}>
      {/* Handle */}
      <View style={{ alignItems: 'center', paddingTop: 12, marginBottom: 16 }}>
        <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.s3 }} />
      </View>

      {/* Section 1: Ride info */}
      <AppText variant="h1" style={{ fontSize: 22, marginBottom: 4 }}>{displayTitle}</AppText>
      <View style={{ gap: 6, marginBottom: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="navigate-outline" size={12} color={Colors.t3} />
          <AppText variant="meta" style={{ fontSize: 12 }}>{listing.destination || displayTitle}</AppText>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="calendar-outline" size={12} color={Colors.t3} />
          <AppText variant="meta" style={{ fontSize: 12 }}>{formattedRideDate(listing.ride_date)}</AppText>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="person-outline" size={12} color={Colors.t3} />
          <AppText variant="meta" style={{ fontSize: 12 }}>Hosted by {listing.display_name}</AppText>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="location-outline" size={12} color={Colors.t3} />
          <AppText variant="meta" style={{ fontSize: 12 }}>Meetup: {listing.meetup_point}</AppText>
        </View>
      </View>

      <View style={{ height: 0.5, backgroundColor: Colors.border, marginBottom: 14 }} />

      {/* Host view */}
      {isHost ? (
        <>
          <AppText variant="label" style={{ color: Colors.t3, marginBottom: 8 }}>Attendees</AppText>
          {rsvps.data?.length ? (
            rsvps.data.map((r) => (
              <View key={r.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                <AppText variant="body" style={{ flex: 1 }}>{r.display_name}</AppText>
                <AppText variant="meta" style={{ color: Colors.t2 }}>{r.status === 'going' ? 'Going' : 'Maybe'}</AppText>
              </View>
            ))
          ) : (
            <AppText variant="meta" style={{ color: Colors.t2 }}>No RSVPs yet.</AppText>
          )}
          <View style={{ height: 0.5, backgroundColor: Colors.border, marginVertical: 14 }} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}><Pressable onPress={() => onEdit(listing)} style={{ backgroundColor: Colors.s2, borderRadius: 13, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: Colors.border }}><AppText variant="bodyBold" style={{ fontSize: 13, color: Colors.t2 }}>Edit</AppText></Pressable></View>
            <View style={{ flex: 1 }}><Pressable onPress={() => onDelete(listing)} style={{ backgroundColor: Colors.red, borderRadius: 13, height: 44, alignItems: 'center', justifyContent: 'center' }}><AppText variant="bodyBold" style={{ fontSize: 13, color: '#FFFFFF' }}>Delete</AppText></Pressable></View>
          </View>
        </>
      ) : (
        <>
          {/* Section 2: Primary CTA */}
          <Pressable
            onPress={rsvpStatus === 'going' ? handleCancelRsvp : handleRsvp}
            style={{
              height: 50,
              borderRadius: 13,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 8,
              backgroundColor: rsvpStatus === 'going' ? Colors.greenDim : rsvpStatus === 'maybe' ? Colors.s2 : Colors.red,
              borderWidth: rsvpStatus === 'going' ? 0.5 : rsvpStatus === 'maybe' ? 0.5 : 0,
              borderColor: rsvpStatus === 'going' ? Colors.green : rsvpStatus === 'maybe' ? Colors.borderMid : 'transparent',
            }}>
            {rsvpStatus === 'going' ? <Ionicons name="checkmark" size={16} color={Colors.green} /> : null}
            <AppText variant="bodyBold" style={{ fontSize: 15, color: rsvpStatus === 'maybe' ? Colors.t2 : '#FFFFFF' }}>
              {rsvpStatus === 'going' ? "You're Going" : 'Join this Ride →'}
            </AppText>
          </Pressable>

          {(goingCount > 0 || maybeCount > 0) ? (
            <AppText variant="meta" style={{ color: Colors.t3, fontSize: 11, textAlign: 'center', marginTop: 8 }}>
              {goingCount} going · {maybeCount} interested
            </AppText>
          ) : null}

          {/* Section 3: Secondary icon row */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
            <Pressable onPress={addToCalendar} style={{ flex: 1, height: 44, backgroundColor: Colors.s2, borderRadius: 10, borderWidth: 0.5, borderColor: Colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Ionicons name="calendar-outline" size={16} color={Colors.t2} />
              <AppText variant="bodyBold" style={{ fontSize: 12, color: Colors.t2 }}>Calendar</AppText>
            </Pressable>
            {listing.lobby_platform !== 'none' && listing.lobby_link ? (
              <Pressable onPress={() => { Linking.openURL(listing.lobby_link!).catch(() => Alert.alert('Could not open link', 'The lobby link may be invalid.')); }} style={{ flex: 1, height: 44, backgroundColor: Colors.s2, borderRadius: 10, borderWidth: 0.5, borderColor: Colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Ionicons name={lobbyIcon} size={16} color={Colors.t2} />
                <AppText variant="bodyBold" style={{ fontSize: 12, color: Colors.t2 }}>{lobbyLabel}</AppText>
              </Pressable>
            ) : null}
          </View>
        </>
      )}

      {/* Section 4: Destructive actions */}
      <View style={{ height: 0.5, backgroundColor: Colors.border, marginTop: 16, marginBottom: 4 }} />
      <Pressable onPress={handleReport} style={{ paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 8, borderTopWidth: 0.5, borderTopColor: Colors.border }}>
        <Ionicons name="flag-outline" size={14} color={Colors.t3} />
        <AppText variant="body" style={{ fontSize: 13, color: Colors.t3 }}>Report this ride</AppText>
      </Pressable>
      <Pressable onPress={handleBlock} style={{ paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Ionicons name="ban-outline" size={14} color="rgba(192,57,43,0.6)" />
        <AppText variant="body" style={{ fontSize: 13, color: 'rgba(192,57,43,0.6)' }}>Block this host</AppText>
      </Pressable>
    </View>
  );
}

export default function BoardTabScreen() {
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const listings = useRideListings(session?.user.id);
  const { deleteRideListing, reportRideListing } = useBoardMutations(session?.user.id);
  const [selectedListing, setSelectedListing] = useState<RideListing | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cityFilter, setCityFilter] = useState<string | null>(null);
  const blockedUserIds = useBlockedUsersStore((s) => s.blockedUserIds);
  const blockUser = useBlockedUsersStore((s) => s.blockUser);
  const hasSeenGuidelines = useAppStore((s) => s.hasSeenCommunityGuidelines);
  const fabOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!hasSeenGuidelines) {
      router.push('/(app)/board/community-guidelines' as any);
    }
  }, [hasSeenGuidelines]);

  useEffect(() => {
    Animated.timing(fabOpacity, {
      toValue: selectedListing ? 0 : 1,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [selectedListing, fabOpacity]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try { await ((listings as any).refetch?.()); } finally { setIsRefreshing(false); }
  }, [listings]);

  const handleReport = useCallback((id: string) => {
    Alert.alert('Report this ride?', 'It will be hidden from the board and flagged for review.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Report', style: 'destructive', onPress: () => reportRideListing.mutate(id) },
    ]);
  }, [reportRideListing]);

  const handleEditListing = useCallback((listing: RideListing) => {
    setSelectedListing(null);
    router.push({ pathname: '/(app)/board/create', params: { listingId: listing.id } });
  }, []);

  const handleDeleteListing = useCallback((listing: RideListing) => {
    Alert.alert(`Delete "${listing.title?.trim() || listing.destination}"?`, 'This ride listing will be removed from the board.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { deleteRideListing.mutate(listing.id); setSelectedListing(null); } },
    ]);
  }, [deleteRideListing]);

  const availableCities = useMemo(() => {
    const cities = new Set<string>();
    (listings.data ?? []).forEach((l) => { if (l.city) cities.add(l.city); });
    return Array.from(cities).sort();
  }, [listings.data]);

  const filteredListings = useMemo(() => {
    let data = listings.data ?? [];
    data = data.filter((l) => !blockedUserIds.includes(l.host_user_id));
    data = data.filter((l) => !l.is_hidden);
    if (cityFilter) data = data.filter((l) => l.city === cityFilter);
    return data;
  }, [listings.data, blockedUserIds, cityFilter]);

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
                  <AppText variant="label" style={{ color: Colors.t3, marginBottom: 6 }}>NEAR ME</AppText>
                  <FlatList data={[null, ...availableCities]} horizontal keyExtractor={(item) => item ?? 'all'} showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}
                    renderItem={({ item }) => {
                      const label = item ?? 'All cities';
                      const active = cityFilter === item;
                      return (
                        <Pressable onPress={() => setCityFilter(item)} style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: active ? palette.text : 'rgba(255,255,255,0.06)', borderWidth: 0.5, borderColor: active ? palette.text : Colors.border }}>
                          <AppText variant="button" style={{ fontSize: 12, color: active ? palette.background : Colors.t2 }}>{label}</AppText>
                        </Pressable>
                      );
                    }}
                  />
                </View>
              ) : null}
              <SectionHeader title="Upcoming" />
            </View>
          }
          renderItem={({ item }) => (
            <RideListingCard listing={item} onPress={() => setSelectedListing(item)} onReport={() => handleReport(item.id)} />
          )}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={palette.text} colors={[palette.danger]} />}
          ListEmptyComponent={<GlassCard style={{ padding: 18 }}><EmptyState icon="radio-outline" title={cityFilter ? `No rides in ${cityFilter}` : 'No upcoming rides'} body={cityFilter ? 'Clear the filter or host your own ride here.' : 'Be the first to post a group ride.'} /></GlassCard>}
        />

        {/* Backdrop */}
        {selectedListing ? (
          <Pressable style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 99 }} onPress={() => setSelectedListing(null)} />
        ) : null}

        {/* Bottom Sheet */}
        {selectedListing ? (
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 100 }}>
            <JoinLobbySheet
              listing={selectedListing}
              onClose={() => setSelectedListing(null)}
              onBlock={blockUser}
              onEdit={handleEditListing}
              onDelete={handleDeleteListing}
              onReport={handleReport}
              currentUserId={session?.user.id}
              displayName={session?.user.user_metadata.display_name ?? 'Kurbada Rider'}
            />
          </View>
        ) : null}

        {/* FAB */}
        <Animated.View style={{ position: 'absolute', bottom: insets.bottom + 76, right: 16, opacity: fabOpacity, zIndex: 200 }}>
          <Pressable
            onPress={() => router.push('/(app)/board/create')}
            style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#C0392B', alignItems: 'center', justifyContent: 'center', shadowColor: '#C0392B', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 }}>
            <AppText variant="bodyBold" style={{ color: '#FFFFFF', fontSize: 24, lineHeight: 28 }}>+</AppText>
          </Pressable>
        </Animated.View>
      </AppScreen>
    </TabTransition>
  );
}

import { Colors } from '@/constants/theme';
