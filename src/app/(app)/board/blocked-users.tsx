import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { AppScrollScreen } from '@/components/ui/app-screen';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { GlassCard } from '@/components/ui/glass-card';
import { palette, radius } from '@/constants/theme';
import { useBlockedUsersStore } from '@/store/blocked-users-store';

export default function BlockedUsersScreen() {
  const blockedUserIds = useBlockedUsersStore((s) => s.blockedUserIds);
  const unblockUser = useBlockedUsersStore((s) => s.unblockUser);

  return (
    <AppScrollScreen showWordmark={false}>
      <View style={{ gap: 8 }}>
        <AppText variant="eyebrow">Privacy</AppText>
        <AppText variant="screenTitle" style={{ fontSize: 28 }}>
          Blocked users
        </AppText>
        <AppText variant="body" style={{ color: palette.textSecondary }}>
          Riders you&apos;ve blocked. Their lobby listings are hidden from your board.
        </AppText>
      </View>

      {blockedUserIds.length === 0 ? (
        <GlassCard style={{ padding: 18 }}>
          <EmptyState icon="shield-outline" title="No one blocked" body="Block hosts from their ride listing to hide their content here." />
        </GlassCard>
      ) : (
        <View style={{ gap: 10 }}>
          {blockedUserIds.map((id) => (
            <GlassCard key={id} style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: radius.lg }}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <AppText variant="mono" numberOfLines={1} style={{ fontSize: 12 }}>
                  {id}
                </AppText>
                <AppText variant="meta" style={{ color: palette.textTertiary }}>
                  Blocked
                </AppText>
              </View>
              <Pressable
                onPress={() => unblockUser(id)}
                style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 0.5, borderColor: palette.border }}>
                <AppText variant="button" style={{ fontSize: 12 }}>
                  Unblock
                </AppText>
              </Pressable>
            </GlassCard>
          ))}
        </View>
      )}

      <Button title="Back" variant="ghost" onPress={() => router.back()} />
    </AppScrollScreen>
  );
}
