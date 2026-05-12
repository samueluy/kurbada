import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useAuth } from '@/hooks/use-auth';
import { useRideMutations } from '@/hooks/use-kurbada-data';

export function PendingRideSyncBridge() {
  const { session } = useAuth();
  const { syncPendingRides } = useRideMutations(session?.user.id);

  useEffect(() => {
    if (!session?.user.id) return;
    syncPendingRides.mutate();
  }, [session?.user.id, syncPendingRides]);

  useEffect(() => {
    if (!session?.user.id) return;

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        syncPendingRides.mutate();
      }
    });

    return () => subscription.remove();
  }, [session?.user.id, syncPendingRides]);

  return null;
}
