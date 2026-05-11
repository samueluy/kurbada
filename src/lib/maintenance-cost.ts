import type { FuelLog, MaintenanceTask, RideRecord } from '@/types/domain';

/**
 * Amortized maintenance cost per task.
 * Philippine averages (PHP) for common motorcycle service items.
 * These are conservative defaults; users can override via the maintenance screen later.
 */
const MAINTENANCE_DEFAULT_COSTS: Record<string, number> = {
  'Engine Oil Change': 800,
  'Chain Tension & Lube': 200,
  'Chain & Sprocket': 3500,
  'Air Filter Service': 400,
  'Brake Pad': 650,
  'Brake Fluid': 300,
  'Spark Plug': 250,
  'Tire (Front)': 2500,
  'Tire (Rear)': 3200,
  'Valve Clearance': 1500,
  'CVT Belt': 1800,
  'Coolant Flush': 500,
  'Battery': 2200,
};

export function estimateMaintenanceCost(taskName: string): number {
  return MAINTENANCE_DEFAULT_COSTS[taskName] ?? 500;
}

/**
 * Cost per km of a single maintenance task.
 */
export function maintenanceCostPerKm(task: MaintenanceTask): number {
  if (!task.interval_km || task.interval_km <= 0) return 0;
  const cost = task.cost ?? estimateMaintenanceCost(task.task_name);
  return cost / task.interval_km;
}

export type MonthlyCostSummary = {
  fuelCost: number;
  maintenanceAccrual: number;
  totalCost: number;
  distanceKm: number;
  costPerKm: number;
};

/**
 * Compute true monthly cost: fuel spend + amortized maintenance based on distance.
 * Uses rides from the current month (local time).
 */
export function computeMonthlyCostSummary({
  rides,
  fuelLogs,
  maintenanceTasks,
  fuelPricePerLiter,
}: {
  rides: RideRecord[];
  fuelLogs: FuelLog[];
  maintenanceTasks: MaintenanceTask[];
  fuelPricePerLiter: number;
}): MonthlyCostSummary {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const monthRides = rides.filter((r) => new Date(r.started_at).getTime() >= monthStart);
  const distanceKm = monthRides.reduce((sum, r) => sum + r.distance_km, 0);

  // Fuel cost: prefer actual fuel-log entries this month; fall back to ride estimates.
  const monthFuelLogs = fuelLogs.filter((f) => {
    const d = new Date(f.logged_at);
    return d.getTime() >= monthStart;
  });
  let fuelCost = monthFuelLogs.reduce((sum, f) => sum + f.total_cost, 0);
  if (fuelCost === 0) {
    fuelCost = monthRides.reduce((sum, r) => sum + (r.fuel_used_liters ?? 0) * fuelPricePerLiter, 0);
  }

  // Maintenance accrual: sum of (km this month * cost-per-km) for every task on every bike.
  // Since multiple tasks apply per km ridden, this accrues them all.
  const perKmAcrossTasks = maintenanceTasks.reduce((sum, t) => sum + maintenanceCostPerKm(t), 0);
  const maintenanceAccrual = distanceKm * perKmAcrossTasks;

  const totalCost = fuelCost + maintenanceAccrual;
  const costPerKm = distanceKm > 0 ? totalCost / distanceKm : 0;

  return {
    fuelCost,
    maintenanceAccrual,
    totalCost,
    distanceKm,
    costPerKm,
  };
}
