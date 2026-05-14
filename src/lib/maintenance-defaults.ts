import { getDefaultMaintenancePresets, maintenancePresetCatalog } from '@/lib/onboarding';
import type { Bike, MaintenancePresetKey, MaintenanceTask } from '@/types/domain';

const presetCostCatalog: Record<MaintenancePresetKey, number> = {
  oil_change: 500,
  chain_lube: 150,
  brake_pad_wear: 800,
  air_filter_service: 400,
  tire_wear: 0,
  cvt_belt_cleaning: 700,
};

const legacyTaskAliases: Record<string, MaintenancePresetKey> = {
  'Engine Oil Change': 'oil_change',
  'Chain Tension & Lube': 'chain_lube',
  'Chain Cleaning/Lube': 'chain_lube',
  'Brake Pad Wear': 'brake_pad_wear',
  'Air Filter': 'air_filter_service',
  'Air Filter Service': 'air_filter_service',
  'Tire Wear Check': 'tire_wear',
  'Tire Replacement / Tire Wear': 'tire_wear',
  'CVT / Belt Cleaning': 'cvt_belt_cleaning',
  'CVT/Belt Cleaning': 'cvt_belt_cleaning',
};

export function resolveMaintenancePresetByTaskName(taskName: string) {
  const presetKey = legacyTaskAliases[taskName];
  if (!presetKey) {
    return null;
  }

  const preset = maintenancePresetCatalog[presetKey];
  return {
    presetKey,
    taskName: preset.taskName,
    intervalKm: preset.intervalKm,
    intervalDays: preset.intervalDays,
    cost: presetCostCatalog[presetKey] ?? 0,
  };
}

export function buildDefaultMaintenanceTasks({
  bikeId,
  category,
  currentOdometerKm,
  lastDoneDate = new Date().toISOString().slice(0, 10),
}: {
  bikeId: string;
  category: Bike['category'];
  currentOdometerKm: number;
  lastDoneDate?: string;
}) {
  return getDefaultMaintenancePresets(category).map((presetKey) => {
    const preset = maintenancePresetCatalog[presetKey];
    return {
      bike_id: bikeId,
      task_name: preset.taskName,
      interval_km: preset.intervalKm,
      interval_days: preset.intervalDays,
      cost: presetCostCatalog[presetKey] ?? 0,
      last_done_odometer_km: currentOdometerKm,
      last_done_date: lastDoneDate,
    } satisfies Omit<MaintenanceTask, 'id'>;
  });
}
