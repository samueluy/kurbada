import type { RideRecord } from '@/types/domain';

export type PersonalRecords = {
  longestRideKm: { value: number; rideId?: string; date?: string } | null;
  mostElevationM: { value: number; rideId?: string; date?: string } | null;
  currentStreakDays: number;
  longestStreakDays: number;
  bestMonthKm: { value: number; monthLabel: string } | null;
  bestWeekRideCount: { value: number; weekLabel: string } | null;
  totalRides: number;
  totalDistanceKm: number;
};

function isoDateOnly(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string) {
  const d1 = new Date(a);
  const d2 = new Date(b);
  d1.setUTCHours(0, 0, 0, 0);
  d2.setUTCHours(0, 0, 0, 0);
  return Math.round((d2.getTime() - d1.getTime()) / 86_400_000);
}

function computeStreaks(rides: RideRecord[]): { current: number; longest: number } {
  if (rides.length === 0) return { current: 0, longest: 0 };

  const uniqueDates = Array.from(new Set(rides.map((r) => isoDateOnly(r.started_at)))).sort();

  let longest = 1;
  let run = 1;
  for (let i = 1; i < uniqueDates.length; i++) {
    const gap = daysBetween(uniqueDates[i - 1], uniqueDates[i]);
    if (gap === 1) {
      run += 1;
      if (run > longest) longest = run;
    } else {
      run = 1;
    }
  }

  // Current streak: walk back from today (or yesterday if no ride today)
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const todayIso = today.toISOString().slice(0, 10);
  const dateSet = new Set(uniqueDates);

  let current = 0;
  const cursor = new Date(today);
  // If no ride today, allow streak to include through yesterday
  if (!dateSet.has(todayIso)) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  while (dateSet.has(cursor.toISOString().slice(0, 10))) {
    current += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return { current, longest };
}

function monthLabelFromDate(d: Date) {
  return d.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
}

function isoWeekLabel(d: Date) {
  const monday = new Date(d);
  const day = monday.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  monday.setUTCDate(monday.getUTCDate() + offset);
  return monday.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

function isoWeekKey(d: Date) {
  const monday = new Date(d);
  monday.setUTCHours(0, 0, 0, 0);
  const day = monday.getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  monday.setUTCDate(monday.getUTCDate() + offset);
  return monday.toISOString().slice(0, 10);
}

export function computePersonalRecords(rides: RideRecord[]): PersonalRecords {
  if (rides.length === 0) {
    return {
      longestRideKm: null,
      mostElevationM: null,
      currentStreakDays: 0,
      longestStreakDays: 0,
      bestMonthKm: null,
      bestWeekRideCount: null,
      totalRides: 0,
      totalDistanceKm: 0,
    };
  }

  let longestRide: RideRecord | null = null;
  let mostElevationRide: RideRecord | null = null;
  let totalDistanceKm = 0;

  const monthlyKm = new Map<string, { km: number; label: string }>();
  const weeklyCount = new Map<string, { count: number; label: string }>();

  for (const ride of rides) {
    totalDistanceKm += ride.distance_km;

    if (!longestRide || ride.distance_km > longestRide.distance_km) {
      longestRide = ride;
    }
    if (
      ride.elevation_gain_m != null
      && (!mostElevationRide || (ride.elevation_gain_m ?? 0) > (mostElevationRide.elevation_gain_m ?? 0))
    ) {
      mostElevationRide = ride;
    }

    const started = new Date(ride.started_at);

    const monthKey = `${started.getUTCFullYear()}-${String(started.getUTCMonth() + 1).padStart(2, '0')}`;
    const monthEntry = monthlyKm.get(monthKey);
    if (monthEntry) {
      monthEntry.km += ride.distance_km;
    } else {
      monthlyKm.set(monthKey, { km: ride.distance_km, label: monthLabelFromDate(started) });
    }

    const weekKey = isoWeekKey(started);
    const weekEntry = weeklyCount.get(weekKey);
    if (weekEntry) {
      weekEntry.count += 1;
    } else {
      weeklyCount.set(weekKey, { count: 1, label: isoWeekLabel(started) });
    }
  }

  const { current, longest } = computeStreaks(rides);

  let bestMonthKm: PersonalRecords['bestMonthKm'] = null;
  for (const entry of monthlyKm.values()) {
    if (!bestMonthKm || entry.km > bestMonthKm.value) {
      bestMonthKm = { value: entry.km, monthLabel: entry.label };
    }
  }

  let bestWeekRideCount: PersonalRecords['bestWeekRideCount'] = null;
  for (const entry of weeklyCount.values()) {
    if (!bestWeekRideCount || entry.count > bestWeekRideCount.value) {
      bestWeekRideCount = { value: entry.count, weekLabel: entry.label };
    }
  }

  return {
    longestRideKm: longestRide
      ? { value: longestRide.distance_km, rideId: longestRide.id, date: longestRide.started_at }
      : null,
    mostElevationM: mostElevationRide
      ? {
          value: mostElevationRide.elevation_gain_m ?? 0,
          rideId: mostElevationRide.id,
          date: mostElevationRide.started_at,
        }
      : null,
    currentStreakDays: current,
    longestStreakDays: longest,
    bestMonthKm,
    bestWeekRideCount,
    totalRides: rides.length,
    totalDistanceKm,
  };
}
