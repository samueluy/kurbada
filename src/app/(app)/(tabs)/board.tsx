import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import { useState } from 'react';
import { Alert, FlatList, Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { AppScreen } from '@/components/ui/app-screen';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { GlassCard } from '@/components/ui/glass-card';
import { SectionHeader } from '@/components/ui/section-header';
import { palette } from '@/constants/theme';
import { RideListingCard } from '@/features/board/components/ride-listing-card';
import { useAuth } from '@/hooks/use-auth';
import { useBoardMutations, useRideListings } from '@/hooks/use-kurbada-data';
import type { RideListing } from '@/types/domain';

function JoinLobbySheet({ listing, onClose }: { listing: RideListing; onClose: () => void }) {
  return (
    <GlassCard style={{ marginTop: 12, padding: 18, gap: 14 }}>
      <AppText variant="title" style={{ fontSize: 18 }}>
        {listing.destination}
      </AppText>
      <AppText variant="meta" style={{ color: palette.textSecondary }}>
        {listing.meetup_point} · {new Date(listing.ride_date).toLocaleString('en-PH', { dateStyle: 'full', timeStyle: 'short' })}
      </AppText>
      <AppText variant="meta">
        Hosted by {listing.display_name}
      </AppText>

      <Button
        title="Join Lobby"
        variant="secondary"
        onPress={() => {
          Linking.openURL(listing.lobby_link).catch(() =>
            Alert.alert('Could not open link', 'The lobby link may be invalid.'),
          );
        }}
        style={{ backgroundColor: palette.surfaceStrong, borderRadius: 14, minHeight: 52 }}
      />
      <Button title="Close" variant="ghost" onPress={onClose} />
    </GlassCard>
  );
}

export default function BoardTabScreen() {
  const { session } = useAuth();
  const listings = useRideListings(session?.user.id);
  const { reportRideListing } = useBoardMutations(session?.user.id);
  const [selectedListing, setSelectedListing] = useState<RideListing | null>(null);

  return (
    <AppScreen style={{ backgroundColor: palette.background }}>
      <FlatList
        data={listings.data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 96, gap: 12 }}
        ListHeaderComponent={
          <View style={{ paddingTop: 8, gap: 8 }}>
            <View style={{ gap: 4 }}>
              <AppText variant="eyebrow">Public Rides</AppText>
              <AppText variant="screenTitle">The lobby is open.</AppText>
              <AppText variant="body">Join group rides and coordinate via Messenger or Telegram.</AppText>
            </View>
            <SectionHeader title="Upcoming" />
          </View>
        }
        renderItem={({ item }) => (
          <RideListingCard
            listing={item}
            onPress={() => setSelectedListing(item)}
            onReport={() => {
              Alert.alert('Report this ride?', 'It will be hidden from the board.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Report', style: 'destructive', onPress: () => reportRideListing.mutate(item.id) },
              ]);
            }}
          />
        )}
        ListEmptyComponent={
          <GlassCard style={{ padding: 18 }}>
            <EmptyState icon="radio-outline" title="No upcoming rides" body="Be the first to post a group ride. Riders will see it here and join your lobby." />
          </GlassCard>
        }
      />

      {selectedListing ? (
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, paddingBottom: 32 }}>
          <JoinLobbySheet listing={selectedListing} onClose={() => setSelectedListing(null)} />
        </View>
      ) : null}

      <Pressable
        onPress={() => router.push('/(app)/board/create')}
        style={{
          position: 'absolute',
          bottom: 100,
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
        <AppText variant="bodyBold" style={{ color: '#FFFFFF', fontSize: 24, lineHeight: 28 }}>+</AppText>
      </Pressable>
    </AppScreen>
  );
}
