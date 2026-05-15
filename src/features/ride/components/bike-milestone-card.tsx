import { Trophy } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { palette } from '@/constants/theme';
import { computeBikeMilestoneStatus, formatMilestoneLabel, unreadMilestones } from '@/lib/bike-milestones';
import { useAppStore } from '@/store/app-store';
import type { Bike } from '@/types/domain';

export function BikeMilestoneCard({ bike }: { bike: Bike | undefined }) {
  const acknowledgedMap = useAppStore((s) => s.acknowledgedBikeMilestones);
  const acknowledge = useAppStore((s) => s.acknowledgeBikeMilestone);

  if (!bike) return null;

  const status = computeBikeMilestoneStatus(bike);
  const acknowledged = acknowledgedMap[bike.id] ?? [];
  const unread = unreadMilestones({ status, acknowledgedOdometerKm: acknowledged });

  // Celebration card for the most-recent unread milestone
  if (unread.length > 0) {
    const km = unread[unread.length - 1];
    return (
      <GlassCard
        style={{
          padding: 18,
          borderRadius: 18,
          gap: 10,
          borderColor: palette.lime,
          borderWidth: 0.5,
          backgroundColor: 'rgba(243,156,18,0.06)',
        }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Trophy size={20} color={palette.lime} />
          <AppText variant="eyebrow" style={{ color: palette.lime }}>
            MILESTONE REACHED
          </AppText>
        </View>
        <AppText variant="title" style={{ fontSize: 22 }}>
          {formatMilestoneLabel(km)} with your {bike.make} {bike.model}
        </AppText>
        <AppText variant="meta" style={{ color: palette.textSecondary }}>
          Nice milestone. Log a ride to record it.
        </AppText>
        <Button
          title="Nice"
          variant="secondary"
          onPress={() => acknowledge(bike.id, km)}
        />
      </GlassCard>
    );
  }

  // Otherwise show progress toward the next milestone
  if (!status.nextOdometerKm) {
    return (
      <GlassCard style={{ padding: 18, borderRadius: 18, gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Trophy size={16} color={palette.lime} />
          <AppText variant="eyebrow">ALL MILESTONES PASSED</AppText>
        </View>
        <AppText variant="meta" style={{ color: palette.textSecondary }}>
          You&apos;ve hit every milestone we track. Keep riding.
        </AppText>
      </GlassCard>
    );
  }

  const progressPct = Math.round(status.progressToNext * 100);

  return (
    <Pressable>
      <GlassCard style={{ padding: 18, borderRadius: 18, gap: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <AppText variant="eyebrow">NEXT BIKE MILESTONE</AppText>
          <Trophy size={18} color={palette.lime} />
        </View>
        <AppText variant="title" style={{ fontSize: 20 }}>
          {status.distanceToNextKm?.toFixed(0)} km to {formatMilestoneLabel(status.nextOdometerKm)}
        </AppText>
        <AppText variant="meta" style={{ color: palette.textSecondary }}>
          {bike.make} {bike.model}
          {status.yearsOwned != null && status.yearsOwned > 0
            ? ` · ${status.yearsOwned} year${status.yearsOwned === 1 ? '' : 's'} owned`
            : ''}
        </AppText>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: palette.surfaceMuted, overflow: 'hidden' }}>
          <View
            style={{
              width: `${progressPct}%`,
              height: '100%',
              backgroundColor: palette.lime,
            }}
          />
        </View>
        <AppText variant="meta" style={{ color: palette.textTertiary, fontSize: 11 }}>
          {progressPct}% of the way there
        </AppText>
      </GlassCard>
    </Pressable>
  );
}
