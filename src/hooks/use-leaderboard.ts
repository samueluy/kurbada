import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useLocalAppStore } from '@/store/local-app-store';
import type { Database } from '@/types/database';
import type { RideRecord } from '@/types/domain';

export type LeaderboardEntry = {
  userId: string;
  displayName: string;
  totalKm: number;
  rank: number;
};

function getWeekStart(): Date {
  const now = new Date();
  const ph = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
  ph.setHours(0, 0, 0, 0);
  ph.setDate(ph.getDate() - ph.getDay());
  return ph;
}

export function useLeaderboard(): LeaderboardEntry[] {
  const { session } = useAuth();
  const currentUserId = session?.user.id;
  const localRides = useLocalAppStore((state) => state.rides);
  const useRemote = Boolean(currentUserId) && isSupabaseConfigured;

  const query = useQuery({
    queryKey: ['leaderboard', currentUserId ?? 'local'],
    enabled: useRemote,
    queryFn: async () => {
      if (!supabase) {
        return { rides: [], profilesById: {} as Record<string, string> };
      }
      const weekStart = getWeekStart().toISOString();
      const { data, error } = await supabase
        .from('rides')
        .select('user_id, distance_km, started_at')
        .gte('started_at', weekStart)
        .order('started_at', { ascending: false })
        .limit(300);
      if (error) throw error;

      const rides = data as Pick<RideRecord, 'user_id' | 'distance_km' | 'started_at'>[];
      const userIds = [...new Set(rides.map((ride) => ride.user_id).filter(Boolean))] as string[];
      let profilesById: Record<string, string> = {};

      if (userIds.length) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, display_name')
          .in('id', userIds);
        if (profilesError) throw profilesError;

        profilesById = Object.fromEntries(
          ((profiles ?? []) as Pick<Database['public']['Tables']['profiles']['Row'], 'id' | 'display_name'>[])
            .map((profile) => [profile.id, profile.display_name?.trim() || `Rider ${profile.id.slice(0, 6)}`]),
        );
      }

      return { rides, profilesById };
    },
  });

  return useMemo(() => {
    const rides = useRemote ? (query.data?.rides ?? []) : localRides;
    const profilesById = useRemote ? (query.data?.profilesById ?? {}) : {};
    if (!rides.length) return [];

    const weekStart = getWeekStart().getTime();

    const distanceByUser = new Map<string, { totalKm: number; displayName: string }>();

    for (const ride of rides) {
      const rideDate = new Date(ride.started_at).getTime();
      if (rideDate < weekStart) continue;

      const userId = ride.user_id ?? 'local';
      const displayName = currentUserId && userId === currentUserId
        ? session?.user.user_metadata.display_name ?? profilesById[userId] ?? 'You'
        : userId === 'local' ? 'Rider' : profilesById[userId] ?? `Rider ${userId.slice(0, 6)}`;

      const existing = distanceByUser.get(userId);
      if (existing) {
        existing.totalKm += ride.distance_km;
      } else {
        distanceByUser.set(userId, { totalKm: ride.distance_km, displayName });
      }
    }

    if (distanceByUser.size === 0) return [];

    const entries: LeaderboardEntry[] = [];
    for (const [userId, data] of distanceByUser) {
      entries.push({
        userId,
        displayName: data.displayName,
        totalKm: Number(data.totalKm.toFixed(1)),
        rank: 0,
      });
    }

    entries.sort((a, b) => b.totalKm - a.totalKm);

    let previousKm: number | null = null;
    let currentRank = 0;

    return entries.map((entry, index) => {
      if (previousKm === null || entry.totalKm < previousKm) {
        currentRank = index + 1;
        previousKm = entry.totalKm;
      }

      return { ...entry, rank: currentRank };
    });
  }, [localRides, query.data, useRemote, currentUserId, session?.user.user_metadata.display_name]);
}
