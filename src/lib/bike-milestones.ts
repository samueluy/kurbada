import type { Bike } from '@/types/domain';

export const ODOMETER_MILESTONES_KM = [1_000, 5_000, 10_000, 25_000, 50_000, 75_000, 100_000, 150_000, 200_000];

export type BikeMilestoneId = string; // e.g. "odo:10000" or "anniversary:1"

export type BikeMilestoneStatus = {
  bikeId: string;
  currentOdometerKm: number;
  /** All odometer milestones the bike has already passed. */
  achievedOdometerKm: number[];
  /** The next upcoming odometer milestone (null if all passed). */
  nextOdometerKm: number | null;
  /** Distance remaining to the next milestone (null if all passed). */
  distanceToNextKm: number | null;
  /** Progress 0..1 toward next milestone, relative to the previous one. */
  progressToNext: number;
  /** Integer number of full years since the bike was added (if `created_at` present). */
  yearsOwned: number | null;
};

export function computeBikeMilestoneStatus(bike: Bike): BikeMilestoneStatus {
  const currentOdometerKm = bike.current_odometer_km ?? 0;

  const achievedOdometerKm = ODOMETER_MILESTONES_KM.filter((km) => currentOdometerKm >= km);
  const nextOdometerKm =
    ODOMETER_MILESTONES_KM.find((km) => currentOdometerKm < km) ?? null;

  const previousOdometerKm = [0, ...ODOMETER_MILESTONES_KM].filter((km) => km <= currentOdometerKm).pop() ?? 0;

  const distanceToNextKm = nextOdometerKm ? Math.max(0, nextOdometerKm - currentOdometerKm) : null;

  const progressToNext =
    nextOdometerKm && nextOdometerKm > previousOdometerKm
      ? Math.min(1, Math.max(0, (currentOdometerKm - previousOdometerKm) / (nextOdometerKm - previousOdometerKm)))
      : 1;

  let yearsOwned: number | null = null;
  if (bike.created_at) {
    const start = new Date(bike.created_at).getTime();
    const years = Math.floor((Date.now() - start) / (365.25 * 24 * 60 * 60 * 1000));
    yearsOwned = Math.max(0, years);
  }

  return {
    bikeId: bike.id,
    currentOdometerKm,
    achievedOdometerKm,
    nextOdometerKm,
    distanceToNextKm,
    progressToNext,
    yearsOwned,
  };
}

/**
 * Given the status and the set of milestones the user has already acknowledged
 * for this bike, return any newly-hit milestones that still need celebrating.
 */
export function unreadMilestones({
  status,
  acknowledgedOdometerKm,
}: {
  status: BikeMilestoneStatus;
  acknowledgedOdometerKm: number[];
}): number[] {
  const acknowledged = new Set(acknowledgedOdometerKm);
  return status.achievedOdometerKm.filter((km) => !acknowledged.has(km));
}

export function formatMilestoneLabel(km: number): string {
  if (km >= 1000) {
    return `${(km / 1000).toLocaleString('en-PH', { maximumFractionDigits: 1 })}k km`;
  }
  return `${km} km`;
}
