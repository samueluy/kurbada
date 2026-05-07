import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { appStorage } from '@/lib/storage';

type BlockedUsersState = {
  blockedUserIds: string[];
  blockUser: (userId: string) => void;
  unblockUser: (userId: string) => void;
  isBlocked: (userId: string) => boolean;
};

export const useBlockedUsersStore = create<BlockedUsersState>()(
  persist(
    (set, get) => ({
      blockedUserIds: [],
      blockUser: (userId) =>
        set((state) => ({
          blockedUserIds: state.blockedUserIds.includes(userId)
            ? state.blockedUserIds
            : [...state.blockedUserIds, userId],
        })),
      unblockUser: (userId) =>
        set((state) => ({
          blockedUserIds: state.blockedUserIds.filter((id) => id !== userId),
        })),
      isBlocked: (userId) => get().blockedUserIds.includes(userId),
    }),
    {
      name: 'kurbada-blocked-users',
      storage: createJSONStorage(() => appStorage),
      partialize: (state) => ({ blockedUserIds: state.blockedUserIds }),
    },
  ),
);
