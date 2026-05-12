import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { useLocalAppStore } from '@/store/local-app-store';
import type { LeaderboardWeeklyKmRow, RideRecord } from '@/types/domain';

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
    queryKey: ['leaderboard-weekly-km'],
    enabled: useRemote,
    queryFn: async () => {
      if (!supabase) {
        return [] as LeaderboardWeeklyKmRow[];
      }

      const { data, error } = await (supabase as any).rpc('leaderboard_weekly_km');
      if (error) throw error;
      return (data ?? []) as LeaderboardWeeklyKmRow[];
    },
  });

  return useMemo(() => {
    if (useRemote) {
      return (query.data ?? []).map((entry) => ({
        userId: entry.user_id,
        displayName: currentUserId && entry.user_id === currentUserId
          ? session?.user.user_metadata.display_name ?? entry.display_name
          : entry.display_name,
        totalKm: Number(Number(entry.total_km).toFixed(1)),
        rank: entry.rank,
      }));
    }

    const rides = localRides;
    if (!rides.length) return [];

    const weekStart = getWeekStart().getTime();
    const distanceByUser = new Map<string, number>();

    for (const ride of rides as RideRecord[]) {
      const rideDate = new Date(ride.started_at).getTime();
      if (rideDate < weekStart) continue;
      const userId = ride.user_id ?? 'local';
      distanceByUser.set(userId, (distanceByUser.get(userId) ?? 0) + ride.distance_km);
    }

    return Array.from(distanceByUser.entries())
      .map(([userId, totalKm], index) => ({
        userId,
        displayName: userId === 'local' ? 'Rider' : `Rider ${userId.slice(0, 6)}`,
        totalKm: Number(totalKm.toFixed(1)),
        rank: index + 1,
      }))
      .sort((a, b) => b.totalKm - a.totalKm)
      .map((entry, index) => ({ ...entry, rank: index + 1 }));
  }, [currentUserId, localRides, query.data, session?.user.user_metadata.display_name, useRemote]);
}
