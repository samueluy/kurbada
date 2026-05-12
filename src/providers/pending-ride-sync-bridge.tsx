import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/hooks/use-auth';
import { useRideMutations } from '@/hooks/use-kurbada-data';
import { useLocalAppStore } from '@/store/local-app-store';

const FOREGROUND_SYNC_THROTTLE_MS = 15_000;

export function PendingRideSyncBridge() {
  const { session } = useAuth();
  const pendingRideCount = useLocalAppStore((state) => state.pendingRides.length);
  const { syncPendingRides } = useRideMutations(session?.user.id);
  const lastSyncAttemptAtRef = useRef(0);

  const attemptSync = useCallback(() => {
    if (!session?.user.id) return;
    if (pendingRideCount === 0) return;
    if (syncPendingRides.isPending) return;

    const now = Date.now();
    if (now - lastSyncAttemptAtRef.current < FOREGROUND_SYNC_THROTTLE_MS) {
      return;
    }

    lastSyncAttemptAtRef.current = now;
    syncPendingRides.mutate();
  }, [pendingRideCount, session?.user.id, syncPendingRides]);

  useEffect(() => {
    if (!session?.user.id || pendingRideCount === 0) return;

    const timeout = setTimeout(() => {
      attemptSync();
    }, 2500);

    return () => clearTimeout(timeout);
  }, [attemptSync, pendingRideCount, session?.user.id]);

  useEffect(() => {
    if (!session?.user.id || pendingRideCount === 0) return;

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        attemptSync();
      }
    });

    return () => subscription.remove();
  }, [attemptSync, pendingRideCount, session?.user.id]);

  return null;
}
