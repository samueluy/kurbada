import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TabTransition } from '@/components/navigation/tab-transition';
import { AppScreen } from '@/components/ui/app-screen';
import { AppText } from '@/components/ui/app-text';
import { EmptyState } from '@/components/ui/empty-state';
import { GlassCard } from '@/components/ui/glass-card';
import { SectionHeader } from '@/components/ui/section-header';
import { Colors, palette, radius } from '@/constants/theme';
import { RideListingCard } from '@/features/board/components/ride-listing-card';
import { useAuth } from '@/hooks/use-auth';
import { useBoardFeed, useBoardMutations } from '@/hooks/use-kurbada-data';
import { useAppStore } from '@/store/app-store';
import { useBlockedUsersStore } from '@/store/blocked-users-store';

function SafetyDisclaimer() {
  return (
    <View style={{ flexDirection: 'row', gap: 8, padding: 12, backgroundColor: 'rgba(243,156,18,0.12)', borderRadius: radius.md, borderWidth: 0.5, borderColor: 'rgba(243,156,18,0.35)' }}>
      <View style={{ flex: 1, gap: 4 }}>
        <AppText variant="label" style={{ color: '#F39C12', letterSpacing: 0.6 }}>RIDE SAFE — COMMUNITY STANDARDS</AppText>
        <AppText variant="meta" style={{ color: palette.textSecondary, fontSize: 11, lineHeight: 16 }}>
          Helmet + gear required, ride at the pace of the slowest, no racing, and every rider stays responsible for their own safety.
        </AppText>
      </View>
    </View>
  );
}

export default function BoardTabScreen() {
  const { session } = useAuth();
  const insets = useSafeAreaInsets();
  const listings = useBoardFeed(session?.user.id);
  const { reportRideListing } = useBoardMutations(session?.user.id);
  const blockedUserIds = useBlockedUsersStore((state) => state.blockedUserIds);
  const hasSeenGuidelines = useAppStore((state) => state.hasSeenCommunityGuidelines);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cityFilter, setCityFilter] = useState<string | null>(null);

  useEffect(() => {
    if (!hasSeenGuidelines) {
      router.push('/(app)/board/community-guidelines' as any);
    }
  }, [hasSeenGuidelines]);

  const availableCities = useMemo(() => {
    const cities = new Set<string>();
    (listings.data ?? []).forEach((listing) => {
      if (listing.city) {
        cities.add(listing.city);
      }
    });
    return Array.from(cities).sort();
  }, [listings.data]);

  const filteredListings = useMemo(() => {
    let next = (listings.data ?? []).filter((listing) => !blockedUserIds.includes(listing.host_user_id) && !listing.is_hidden);
    if (cityFilter) {
      next = next.filter((listing) => listing.city === cityFilter);
    }
    return next;
  }, [blockedUserIds, cityFilter, listings.data]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await (listings as { refetch?: () => Promise<unknown> }).refetch?.();
    } finally {
      setIsRefreshing(false);
    }
  }, [listings]);

  const handleReport = useCallback((listingId: string) => {
    Alert.alert('Report this ride?', 'It will be hidden from the board and flagged for review.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Report', style: 'destructive', onPress: () => reportRideListing.mutate(listingId) },
    ]);
  }, [reportRideListing]);

  return (
    <TabTransition>
      <AppScreen style={{ backgroundColor: palette.background, paddingTop: 14 }}>
        <FlatList
          data={filteredListings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 96, gap: 12 }}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={palette.text} colors={[palette.danger]} />}
          ListHeaderComponent={(
            <View style={{ paddingTop: 8, gap: 12 }}>
              <SafetyDisclaimer />
              {availableCities.length > 0 ? (
                <View>
                  <AppText variant="label" style={{ color: Colors.t3, marginBottom: 6 }}>NEAR ME</AppText>
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
                            borderColor: active ? palette.text : Colors.border,
                          }}>
                          <AppText variant="button" style={{ fontSize: 12, color: active ? palette.background : Colors.t2 }}>
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
          )}
          renderItem={({ item }) => (
            <RideListingCard
              listing={item}
              onPress={() => router.push({ pathname: '/(app)/board/[listingId]' as any, params: { listingId: item.id } })}
              onReport={() => handleReport(item.id)}
            />
          )}
          ListEmptyComponent={(
            <GlassCard style={{ padding: 18 }}>
              <EmptyState
                icon="radio-outline"
                title={cityFilter ? `No rides in ${cityFilter}` : 'No upcoming rides'}
                body={cityFilter ? 'Clear the filter or host your own ride here.' : 'Be the first to post a group ride.'}
              />
            </GlassCard>
          )}
        />

        <View style={{ position: 'absolute', bottom: insets.bottom + 76, right: 16 }}>
          <Pressable
            onPress={() => router.push('/(app)/board/create')}
            style={{
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
        </View>
      </AppScreen>
    </TabTransition>
  );
}
