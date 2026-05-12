import type { Bike, FuelLog, RideRecord } from '@/types/domain';

export type BikeAchievementCategory =
  | 'odometer'
  | 'ride_count'
  | 'distance'
  | 'fuel_logs'
  | 'ownership';

export type BikeAchievement = {
  id: string;
  category: BikeAchievementCategory;
  title: string;
  description: string;
  progressLabel: string;
  unlocked: boolean;
  progress: number;
};

const ODOMETER_LEVELS = [1_000, 5_000, 10_000, 25_000, 50_000, 75_000, 100_000, 150_000, 200_000];
const RIDE_COUNT_LEVELS = [1, 5, 10, 25, 50];
const DISTANCE_LEVELS = [100, 500, 1_000, 2_500, 5_000];
const FUEL_LOG_LEVELS = [1, 5, 10, 25];
const OWNERSHIP_YEAR_LEVELS = [1, 2];

function progressRatio(current: number, target: number) {
  if (target <= 0) return 1;
  return Math.max(0, Math.min(1, current / target));
}

export function getBikeAchievementGroups(bike: Bike, rides: RideRecord[], fuelLogs: FuelLog[]) {
  const ridesForBike = rides.filter((ride) => ride.bike_id === bike.id);
  const fuelLogsForBike = fuelLogs.filter((fuelLog) => fuelLog.bike_id === bike.id);
  const totalDistanceKm = ridesForBike.reduce((sum, ride) => sum + ride.distance_km, 0);
  const yearsOwned = bike.created_at
    ? Math.max(0, Math.floor((Date.now() - new Date(bike.created_at).getTime()) / (365.25 * 24 * 60 * 60 * 1000)))
    : 0;

  const achievements: BikeAchievement[] = [
    ...ODOMETER_LEVELS.map((targetKm) => ({
      id: `odometer:${targetKm}`,
      category: 'odometer' as const,
      title: `${targetKm.toLocaleString('en-PH')} km`,
      description: 'Push this bike’s odometer to the next ownership chapter.',
      progressLabel: `${bike.current_odometer_km.toLocaleString('en-PH')} / ${targetKm.toLocaleString('en-PH')} km`,
      unlocked: bike.current_odometer_km >= targetKm,
      progress: progressRatio(bike.current_odometer_km, targetKm),
    })),
    ...RIDE_COUNT_LEVELS.map((targetCount) => ({
      id: `ride-count:${targetCount}`,
      category: 'ride_count' as const,
      title: `${targetCount} ride${targetCount === 1 ? '' : 's'} logged`,
      description: 'Build a real timeline of how this bike is ridden.',
      progressLabel: `${ridesForBike.length} / ${targetCount} rides`,
      unlocked: ridesForBike.length >= targetCount,
      progress: progressRatio(ridesForBike.length, targetCount),
    })),
    ...DISTANCE_LEVELS.map((targetKm) => ({
      id: `distance:${targetKm}`,
      category: 'distance' as const,
      title: `${targetKm.toLocaleString('en-PH')} km tracked`,
      description: 'Total recorded distance across all saved rides for this bike.',
      progressLabel: `${totalDistanceKm.toFixed(0)} / ${targetKm.toLocaleString('en-PH')} km`,
      unlocked: totalDistanceKm >= targetKm,
      progress: progressRatio(totalDistanceKm, targetKm),
    })),
    ...FUEL_LOG_LEVELS.map((targetCount) => ({
      id: `fuel-logs:${targetCount}`,
      category: 'fuel_logs' as const,
      title: `${targetCount} fuel log${targetCount === 1 ? '' : 's'}`,
      description: 'Track fill-ups so costs and habits stay grounded in real usage.',
      progressLabel: `${fuelLogsForBike.length} / ${targetCount} fill-ups`,
      unlocked: fuelLogsForBike.length >= targetCount,
      progress: progressRatio(fuelLogsForBike.length, targetCount),
    })),
    ...OWNERSHIP_YEAR_LEVELS.map((targetYears) => ({
      id: `ownership:${targetYears}`,
      category: 'ownership' as const,
      title: `${targetYears} year${targetYears === 1 ? '' : 's'} together`,
      description: 'Stay the course and keep the bike in your garage long enough to mark the milestone.',
      progressLabel: `${yearsOwned} / ${targetYears} years`,
      unlocked: yearsOwned >= targetYears,
      progress: progressRatio(yearsOwned, targetYears),
    })),
  ];

  const grouped = {
    odometer: achievements.filter((item) => item.category === 'odometer'),
    ride_count: achievements.filter((item) => item.category === 'ride_count'),
    distance: achievements.filter((item) => item.category === 'distance'),
    fuel_logs: achievements.filter((item) => item.category === 'fuel_logs'),
    ownership: achievements.filter((item) => item.category === 'ownership'),
  };

  const unlockedCount = achievements.filter((item) => item.unlocked).length;

  return {
    achievements,
    grouped,
    unlockedCount,
    totalCount: achievements.length,
  };
}
