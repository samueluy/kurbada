import { useLocalSearchParams } from 'expo-router';
import { Trophy } from 'lucide-react-native';
import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { AppScrollScreen } from '@/components/ui/app-screen';
import { GlassCard } from '@/components/ui/glass-card';
import { SectionHeader } from '@/components/ui/section-header';
import { palette } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useBikes, useFuelLogs, useRides } from '@/hooks/use-kurbada-data';
import { getBikeAchievementGroups, type BikeAchievementCategory } from '@/lib/bike-achievements';

const categoryTitles: Record<BikeAchievementCategory, string> = {
  odometer: 'Odometer Milestones',
  ride_count: 'Ride Count',
  distance: 'Tracked Distance',
  fuel_logs: 'Fuel Logging',
  ownership: 'Ownership Time',
};

export default function BikeAchievementsScreen() {
  const params = useLocalSearchParams<{ bikeId?: string }>();
  const { session } = useAuth();
  const bikes = useBikes(session?.user.id);
  const rides = useRides(session?.user.id);
  const fuelLogs = useFuelLogs(session?.user.id);
  const bike = bikes.data?.find((item) => item.id === params.bikeId);

  if (!bike) return null;

  const achievementState = getBikeAchievementGroups(bike, rides.data ?? [], fuelLogs.data ?? []);

  return (
    <AppScrollScreen>
      <View style={{ gap: 8 }}>
        <AppText variant="eyebrow">Achievements</AppText>
        <AppText variant="screenTitle">{bike.nickname?.trim() || `${bike.make} ${bike.model}`}</AppText>
        <AppText variant="body" style={{ color: palette.textSecondary }}>
          Every milestone this bike has already unlocked, plus the next ones still waiting.
        </AppText>
      </View>

      <GlassCard style={{ padding: 18, gap: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ gap: 4 }}>
            <AppText variant="eyebrow">Progress</AppText>
            <AppText variant="bodyBold" style={{ fontSize: 24 }}>
              {achievementState.unlockedCount}/{achievementState.totalCount}
            </AppText>
          </View>
          <Trophy size={22} color={palette.warning} />
        </View>
        <AppText variant="meta" style={{ color: palette.textSecondary }}>
          Locked achievements stay visible so the next target is always clear.
        </AppText>
      </GlassCard>

      {(Object.keys(achievementState.grouped) as BikeAchievementCategory[]).map((category) => (
        <View key={category} style={{ gap: 10 }}>
          <SectionHeader title={categoryTitles[category]} />
          <View style={{ gap: 10 }}>
            {achievementState.grouped[category].map((achievement) => (
              <GlassCard key={achievement.id} style={{ padding: 16, gap: 10, borderColor: achievement.unlocked ? palette.warning : palette.border }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <AppText variant="bodyBold">{achievement.title}</AppText>
                    <AppText variant="meta" style={{ color: palette.textSecondary }}>
                      {achievement.description}
                    </AppText>
                  </View>
                  <AppText variant="label" style={{ color: achievement.unlocked ? palette.warning : palette.textTertiary }}>
                    {achievement.unlocked ? 'Unlocked' : 'Locked'}
                  </AppText>
                </View>
                <View style={{ height: 6, borderRadius: 3, backgroundColor: palette.surfaceStrong, overflow: 'hidden' }}>
                  <View
                    style={{
                      width: `${Math.max(6, Math.round(achievement.progress * 100))}%`,
                      height: '100%',
                      backgroundColor: achievement.unlocked ? palette.warning : palette.textTertiary,
                    }}
                  />
                </View>
                <AppText variant="meta" style={{ color: palette.textSecondary }}>
                  {achievement.progressLabel}
                </AppText>
              </GlassCard>
            ))}
          </View>
        </View>
      ))}
    </AppScrollScreen>
  );
}
