import type { Bike, GearItem } from '@/types/domain';

export type GearHealth = {
  itemId: string;
  percentRemaining: number; // 0..1, 1 = brand new, 0 = replace now
  reason: 'time' | 'km' | 'both' | 'none';
  statusLabel: string;
  dueSoon: boolean;
  overdue: boolean;
};

const SOON_THRESHOLD = 0.15; // within 15% of end-of-life

/**
 * Rider-facing humanized copy for each category.
 * Purely cosmetic — replacement thresholds come from the gear item itself.
 */
export const GEAR_CATEGORY_LABELS: Record<GearItem['category'], string> = {
  helmet: 'Helmet',
  jacket: 'Jacket',
  gloves: 'Gloves',
  boots: 'Boots',
  pants: 'Pants',
  tire_front: 'Front Tire',
  tire_rear: 'Rear Tire',
  chain: 'Chain',
  battery: 'Battery',
  other: 'Other',
};

/**
 * Conservative default lifetimes. Users can override per-item.
 * Based on PH market averages and manufacturer guidance.
 */
export const GEAR_CATEGORY_DEFAULTS: Record<
  GearItem['category'],
  { lifetimeMonths?: number; lifetimeKm?: number }
> = {
  helmet: { lifetimeMonths: 60 }, // 5-year rule
  jacket: { lifetimeMonths: 84 },
  gloves: { lifetimeMonths: 36 },
  boots: { lifetimeMonths: 60 },
  pants: { lifetimeMonths: 60 },
  tire_front: { lifetimeKm: 15_000 },
  tire_rear: { lifetimeKm: 10_000 },
  chain: { lifetimeKm: 20_000 },
  battery: { lifetimeMonths: 36 },
  other: {},
};

function monthsBetween(fromIso: string, toMs: number): number {
  const from = new Date(fromIso).getTime();
  return Math.max(0, (toMs - from) / (1000 * 60 * 60 * 24 * 30.4375));
}

export function computeGearHealth(item: GearItem, bike: Bike | undefined): GearHealth {
  const now = Date.now();
  const monthsElapsed = monthsBetween(item.install_date, now);

  let timeRatio: number | null = null;
  if (item.expected_lifetime_months && item.expected_lifetime_months > 0) {
    timeRatio = Math.min(1, monthsElapsed / item.expected_lifetime_months);
  }

  let kmRatio: number | null = null;
  if (
    item.expected_lifetime_km
    && item.expected_lifetime_km > 0
    && item.install_odometer_km != null
    && bike
    && bike.current_odometer_km != null
  ) {
    const kmUsed = Math.max(0, bike.current_odometer_km - item.install_odometer_km);
    kmRatio = Math.min(1, kmUsed / item.expected_lifetime_km);
  }

  let usedRatio: number;
  let reason: GearHealth['reason'];
  if (timeRatio !== null && kmRatio !== null) {
    usedRatio = Math.max(timeRatio, kmRatio);
    reason = 'both';
  } else if (timeRatio !== null) {
    usedRatio = timeRatio;
    reason = 'time';
  } else if (kmRatio !== null) {
    usedRatio = kmRatio;
    reason = 'km';
  } else {
    usedRatio = 0;
    reason = 'none';
  }

  const percentRemaining = Math.max(0, 1 - usedRatio);
  const overdue = usedRatio >= 1;
  const dueSoon = !overdue && percentRemaining <= SOON_THRESHOLD;

  let statusLabel = 'Healthy';
  if (overdue) statusLabel = 'Replace now';
  else if (dueSoon) statusLabel = 'Replacement due soon';
  else if (reason === 'none') statusLabel = 'No lifetime set';

  return {
    itemId: item.id,
    percentRemaining,
    reason,
    statusLabel,
    dueSoon,
    overdue,
  };
}
