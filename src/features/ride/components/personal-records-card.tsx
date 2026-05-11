import { Calendar, Flame, Mountain, Route, Trophy } from 'lucide-react-native';
import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { GlassCard } from '@/components/ui/glass-card';
import { palette, radius } from '@/constants/theme';
import type { PersonalRecords } from '@/lib/personal-records';

type Entry = {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
};

export function PersonalRecordsCard({ records }: { records: PersonalRecords }) {
  const entries: Entry[] = [];

  if (records.longestRideKm) {
    entries.push({
      icon: <Route size={14} color={palette.text} />,
      label: 'Longest ride',
      value: `${records.longestRideKm.value.toFixed(1)} km`,
      hint: records.longestRideKm.date
        ? new Date(records.longestRideKm.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
        : undefined,
    });
  }

  if (records.mostElevationM && records.mostElevationM.value > 0) {
    entries.push({
      icon: <Mountain size={14} color={palette.text} />,
      label: 'Most elevation gained',
      value: `${Math.round(records.mostElevationM.value).toLocaleString('en-PH')} m`,
      hint: records.mostElevationM.date
        ? new Date(records.mostElevationM.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
        : undefined,
    });
  }

  if (records.longestStreakDays > 0) {
    entries.push({
      icon: <Flame size={14} color={palette.text} />,
      label: 'Longest streak',
      value: `${records.longestStreakDays} day${records.longestStreakDays === 1 ? '' : 's'}`,
      hint: records.currentStreakDays > 0 ? `Current: ${records.currentStreakDays}d` : 'Current: 0d',
    });
  }

  if (records.bestMonthKm) {
    entries.push({
      icon: <Calendar size={14} color={palette.text} />,
      label: 'Best month',
      value: `${records.bestMonthKm.value.toFixed(0)} km`,
      hint: records.bestMonthKm.monthLabel,
    });
  }

  if (records.bestWeekRideCount) {
    entries.push({
      icon: <Trophy size={14} color={palette.text} />,
      label: 'Most rides in a week',
      value: `${records.bestWeekRideCount.value} ride${records.bestWeekRideCount.value === 1 ? '' : 's'}`,
      hint: `Week of ${records.bestWeekRideCount.weekLabel}`,
    });
  }

  return (
    <GlassCard style={{ padding: 18, borderRadius: 18, gap: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <AppText variant="eyebrow">PERSONAL RECORDS</AppText>
        <Trophy size={18} color={palette.lime} />
      </View>

      {entries.length === 0 ? (
        <AppText variant="meta" style={{ color: palette.textSecondary }}>
          Finish a ride to start setting records.
        </AppText>
      ) : (
        <View style={{ gap: 10 }}>
          {entries.map((e, i) => (
            <View key={`${e.label}-${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: radius.sm,
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                {e.icon}
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="meta" style={{ color: palette.textSecondary, fontSize: 12 }}>
                  {e.label}
                </AppText>
                <AppText variant="bodyBold" style={{ fontSize: 14 }}>
                  {e.value}
                </AppText>
              </View>
              {e.hint ? (
                <AppText variant="meta" style={{ color: palette.textTertiary, fontSize: 11 }}>
                  {e.hint}
                </AppText>
              ) : null}
            </View>
          ))}
        </View>
      )}
    </GlassCard>
  );
}
