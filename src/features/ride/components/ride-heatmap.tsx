import { useMemo } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { palette, radius } from '@/constants/theme';
import type { RideRecord } from '@/types/domain';

function startOfDay(input: Date) {
  const next = new Date(input);
  next.setHours(0, 0, 0, 0);
  return next;
}

function buildDailySeries(rides: RideRecord[], numDays: number) {
  const today = startOfDay(new Date());
  const distanceByDate = new Map<string, number>();

  rides.forEach((ride) => {
    const dayKey = startOfDay(new Date(ride.started_at)).toISOString().slice(0, 10);
    distanceByDate.set(dayKey, (distanceByDate.get(dayKey) ?? 0) + ride.distance_km);
  });

  const days: { key: string; label: string; distance: number }[] = [];
  for (let index = numDays - 1; index >= 0; index -= 1) {
    const date = new Date(today);
    date.setDate(date.getDate() - index);
    const key = date.toISOString().slice(0, 10);
    days.push({
      key,
      label: date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }),
      distance: distanceByDate.get(key) ?? 0,
    });
  }

  return days;
}

function countCurrentStreak(days: { distance: number }[]) {
  let streak = 0;
  for (let index = days.length - 1; index >= 0; index -= 1) {
    if (days[index].distance <= 0) {
      break;
    }
    streak += 1;
  }
  return streak;
}

export function CustomCalendarHeatmap({ rides, numDays = 90 }: { rides: RideRecord[]; numDays?: number }) {
  const days = useMemo(() => buildDailySeries(rides, numDays), [rides, numDays]);

  const timeline = useMemo(() => {
    const recentDays = days.slice(-21);
    const maxDistance = recentDays.reduce((largest, day) => Math.max(largest, day.distance), 0);
    const totalDistance = recentDays.reduce((sum, day) => sum + day.distance, 0);
    const activeDays = recentDays.filter((day) => day.distance > 0).length;
    const streak = countCurrentStreak(recentDays);
    const lastSevenDays = recentDays.slice(-7).reduce((sum, day) => sum + day.distance, 0);

    return {
      recentDays,
      maxDistance: maxDistance || 1,
      totalDistance,
      activeDays,
      streak,
      lastSevenDays,
    };
  }, [days]);

  return (
    <View style={{ gap: 14, paddingVertical: 10, paddingHorizontal: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <View style={{ flex: 1, gap: 6 }}>
          <AppText variant="eyebrow">RIDE ACTIVITY</AppText>
          <AppText variant="body" style={{ color: palette.textSecondary }}>
            Your rides over the last 3 weeks.
          </AppText>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 2 }}>
          <AppText variant="heroMetric" style={{ fontSize: 30, lineHeight: 30 }}>
            {timeline.streak}
          </AppText>
          <AppText variant="meta" style={{ color: palette.textTertiary }}>
            day streak
          </AppText>
        </View>
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: 5,
          height: 108,
          paddingVertical: 4,
        }}>
        {timeline.recentDays.map((day, index) => {
          const height = day.distance > 0
            ? Math.max(10, (day.distance / timeline.maxDistance) * 84)
            : 6;
          const isRecent = index >= timeline.recentDays.length - 7;
          return (
            <View key={day.key} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
              <View
                style={{
                  width: '100%',
                  height,
                  borderRadius: radius.sm,
                  backgroundColor: day.distance > 0
                    ? (isRecent ? palette.danger : 'rgba(230,57,70,0.48)')
                    : 'rgba(255,255,255,0.08)',
                }}
              />
              <AppText variant="meta" style={{ color: palette.textTertiary, fontSize: 9 }}>
                {index % 3 === 0 ? day.label.split(' ')[1] : '·'}
              </AppText>
            </View>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1, borderRadius: radius.md, padding: 12, backgroundColor: 'rgba(255,255,255,0.04)' }}>
          <AppText variant="label" style={{ color: palette.textTertiary }}>
            Last 7 Days
          </AppText>
          <AppText variant="bodyBold" style={{ fontSize: 22, marginTop: 4 }}>
            {timeline.lastSevenDays.toFixed(0)} km
          </AppText>
        </View>
        <View style={{ flex: 1, borderRadius: radius.md, padding: 12, backgroundColor: 'rgba(255,255,255,0.04)' }}>
          <AppText variant="label" style={{ color: palette.textTertiary }}>
            Active Days
          </AppText>
          <AppText variant="bodyBold" style={{ fontSize: 22, marginTop: 4 }}>
            {timeline.activeDays}/21
          </AppText>
        </View>
        <View style={{ flex: 1, borderRadius: radius.md, padding: 12, backgroundColor: 'rgba(255,255,255,0.04)' }}>
          <AppText variant="label" style={{ color: palette.textTertiary }}>
            Total
          </AppText>
          <AppText variant="bodyBold" style={{ fontSize: 22, marginTop: 4 }}>
            {timeline.totalDistance.toFixed(0)} km
          </AppText>
        </View>
      </View>
    </View>
  );
}
