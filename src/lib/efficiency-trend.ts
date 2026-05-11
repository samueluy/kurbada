import type { RideRecord } from '@/types/domain';

export type EfficiencyTrend = {
  currentKmPerLiter: number | null;
  previousKmPerLiter: number | null;
  deltaKmPerLiter: number | null; // current − previous
  percentChange: number | null; // signed, rounded to 1 decimal
  direction: 'better' | 'worse' | 'flat' | 'insufficient_data';
  hint: string;
  currentDistanceKm: number;
  previousDistanceKm: number;
};

const MIN_DISTANCE_KM = 20; // avoid noisy trends on short samples

/**
 * Compute last-7-days km/L vs the preceding 7 days.
 * Returns a trend summary with a rider-friendly hint.
 *
 * We use the rides' `fuel_used_liters` estimate because it reflects actual riding
 * (vs. fuel logs which include non-ride fill-ups). If estimates are missing we
 * skip the ride.
 */
export function computeEfficiencyTrend(rides: RideRecord[]): EfficiencyTrend {
  const now = Date.now();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const last7Start = now - weekMs;
  const prev7Start = now - 2 * weekMs;

  const last7: RideRecord[] = [];
  const prev7: RideRecord[] = [];

  for (const ride of rides) {
    if (!ride.fuel_used_liters || ride.fuel_used_liters <= 0) continue;
    const t = new Date(ride.started_at).getTime();
    if (t >= last7Start) last7.push(ride);
    else if (t >= prev7Start) prev7.push(ride);
  }

  const currentDistanceKm = last7.reduce((s, r) => s + r.distance_km, 0);
  const previousDistanceKm = prev7.reduce((s, r) => s + r.distance_km, 0);
  const currentLiters = last7.reduce((s, r) => s + (r.fuel_used_liters ?? 0), 0);
  const previousLiters = prev7.reduce((s, r) => s + (r.fuel_used_liters ?? 0), 0);

  const currentKmPerLiter = currentLiters > 0 ? currentDistanceKm / currentLiters : null;
  const previousKmPerLiter = previousLiters > 0 ? previousDistanceKm / previousLiters : null;

  if (
    currentKmPerLiter === null
    || previousKmPerLiter === null
    || currentDistanceKm < MIN_DISTANCE_KM
    || previousDistanceKm < MIN_DISTANCE_KM
  ) {
    return {
      currentKmPerLiter,
      previousKmPerLiter,
      deltaKmPerLiter: null,
      percentChange: null,
      direction: 'insufficient_data',
      hint: 'Log at least two weeks of rides to see your efficiency trend.',
      currentDistanceKm,
      previousDistanceKm,
    };
  }

  const deltaKmPerLiter = currentKmPerLiter - previousKmPerLiter;
  const percentChange = Math.round((deltaKmPerLiter / previousKmPerLiter) * 1000) / 10;

  let direction: EfficiencyTrend['direction'] = 'flat';
  if (percentChange > 3) direction = 'better';
  else if (percentChange < -3) direction = 'worse';

  const hint = (() => {
    if (direction === 'better') {
      return `Efficiency up ${Math.abs(percentChange).toFixed(1)}% week over week. Keep that throttle smooth.`;
    }
    if (direction === 'worse') {
      return `Efficiency down ${Math.abs(percentChange).toFixed(1)}% week over week. Check tire pressure, air filter, and chain tension.`;
    }
    return 'Efficiency is holding steady. Consistent habits, consistent ₱/km.';
  })();

  return {
    currentKmPerLiter,
    previousKmPerLiter,
    deltaKmPerLiter,
    percentChange,
    direction,
    hint,
    currentDistanceKm,
    previousDistanceKm,
  };
}
