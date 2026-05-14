import { useQuery } from '@tanstack/react-query';

import { getRidePointCount, getStoredRideSession, type StoredRideSession } from '@/lib/ride-point-storage';

export type UnfinishedRideRecovery = {
  session: StoredRideSession;
  pointCount: number;
  isStale: boolean;
};

const STALE_RIDE_THRESHOLD_MS = 5 * 60_000;

export function useUnfinishedRideRecovery(enabled = true) {
  return useQuery({
    queryKey: ['unfinished-ride-recovery'],
    enabled,
    staleTime: 0,
    gcTime: 10 * 60_000,
    queryFn: async (): Promise<UnfinishedRideRecovery | null> => {
      const session = await getStoredRideSession();
      if (!session) {
        return null;
      }

      const pointCount = await getRidePointCount(session.rideId);
      const lastTimestamp = session.lastPointTimestamp ?? session.startedAt;

      return {
        session,
        pointCount,
        isStale: Date.now() - lastTimestamp > STALE_RIDE_THRESHOLD_MS,
      };
    },
  });
}
