import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { GlassCard } from '@/components/ui/glass-card';
import { palette, radius } from '@/constants/theme';
import type { LeaderboardEntry } from '@/hooks/use-leaderboard';

function RankBadge({ rank }: { rank: number }) {
  const colors = {
    1: { bg: '#DAA520', text: '#000', label: '1st' },
    2: { bg: '#C0C0C0', text: '#000', label: '2nd' },
    3: { bg: '#CD7F32', text: '#000', label: '3rd' },
  };
  const style = colors[rank as 1 | 2 | 3];
  if (!style) {
    return (
      <AppText variant="bodyBold" style={{ color: palette.textTertiary, width: 32, fontSize: 13 }}>
        {rank}
      </AppText>
    );
  }
  return (
    <View style={{ backgroundColor: style.bg, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 }}>
      <AppText variant="bodyBold" style={{ color: style.text, fontSize: 11 }}>{style.label}</AppText>
    </View>
  );
}

export function LeaderboardSection({ entries, currentUserId }: { entries: LeaderboardEntry[]; currentUserId?: string }) {
  if (!entries.length) {
    return (
      <GlassCard style={{ padding: 18 }}>
        <AppText variant="eyebrow" style={{ color: palette.textSecondary }}>WEEKLY LEADERBOARD</AppText>
        <AppText variant="meta" style={{ color: palette.textTertiary, marginTop: 8, textAlign: 'center' }}>
          No rides recorded this week. Start riding to appear here!
        </AppText>
      </GlassCard>
    );
  }

  return (
    <GlassCard style={{ padding: 16, gap: 10 }}>
      <AppText variant="eyebrow" style={{ color: palette.textSecondary }}>WEEKLY LEADERBOARD</AppText>
      {entries.map((entry) => {
        const isCurrentUser = currentUserId === entry.userId;
        const isTop3 = entry.rank <= 3;
        return (
          <View
            key={entry.userId}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              paddingVertical: 8,
              paddingHorizontal: 4,
              backgroundColor: isCurrentUser ? 'rgba(255,255,255,0.04)' : 'transparent',
              borderRadius: radius.md,
            }}>
            <RankBadge rank={entry.rank} />
            <AppText
              variant="bodyBold"
              numberOfLines={1}
              style={{
                flex: 1,
                fontSize: 14,
                color: isCurrentUser ? palette.text : isTop3 ? palette.text : palette.textSecondary,
              }}>
              {entry.displayName}
              {isCurrentUser ? ' (You)' : ''}
            </AppText>
            <AppText variant="bodyBold" style={{ color: isTop3 ? palette.lime : palette.textSecondary, fontSize: 14 }}>
              {entry.totalKm.toFixed(1)} km
            </AppText>
          </View>
        );
      })}
    </GlassCard>
  );
}
