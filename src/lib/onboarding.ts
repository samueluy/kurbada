import type { Bike, MaintenancePresetKey, RideMode } from '@/types/domain';

export const bikeCategoryOptions: {
  value: Bike['category'];
  label: string;
  icon: 'motorbike' | 'motorbike-electric' | 'bike-fast' | 'scooter';
}[] = [
  { value: 'sport', label: 'Sport', icon: 'motorbike' },
  { value: 'naked', label: 'Naked', icon: 'motorbike-electric' },
  { value: 'adventure', label: 'Adventure', icon: 'bike-fast' },
  { value: 'scooter', label: 'Scooter', icon: 'scooter' },
];

export const rideStyleOptions: {
  mode: RideMode;
  label: string;
  subtitle: string;
  icon: 'speedometer' | 'flash-outline';
}[] = [
  {
    mode: 'weekend',
    label: 'Weekend Twisties',
    subtitle: 'Cinematic telemetry, curves, max lean',
    icon: 'speedometer',
  },
  {
    mode: 'hustle',
    label: 'Daily Ride',
    subtitle: 'Traffic efficiency, fuel tracking, battery smart',
    icon: 'flash-outline',
  },
];

export const maintenancePresetCatalog: Record<
  MaintenancePresetKey,
  {
    label: string;
    taskName: string;
    intervalKm: number;
    intervalDays: number | null;
    categories?: Bike['category'][];
  }
> = {
  oil_change: {
    label: 'Oil Change Intervals',
    taskName: 'Engine Oil Change',
    intervalKm: 3000,
    intervalDays: 180,
  },
  chain_lube: {
    label: 'Chain Cleaning/Lube',
    taskName: 'Chain Tension & Lube',
    intervalKm: 600,
    intervalDays: 90,
    categories: ['sport', 'naked', 'adventure'],
  },
  brake_pad_wear: {
    label: 'Brake Pad Wear',
    taskName: 'Brake Pad Wear',
    intervalKm: 6000,
    intervalDays: 240,
  },
  air_filter_service: {
    label: 'Air Filter Service',
    taskName: 'Air Filter',
    intervalKm: 9000,
    intervalDays: 365,
  },
  tire_wear: {
    label: 'Tire Replacement / Tire Wear',
    taskName: 'Tire Wear Check',
    intervalKm: 12000,
    intervalDays: 365,
  },
  cvt_belt_cleaning: {
    label: 'CVT/Belt Cleaning',
    taskName: 'CVT / Belt Cleaning',
    intervalKm: 5000,
    intervalDays: 180,
    categories: ['scooter'],
  },
};

const defaultByCategory: Record<Bike['category'], MaintenancePresetKey[]> = {
  sport: ['oil_change', 'chain_lube', 'brake_pad_wear', 'air_filter_service', 'tire_wear'],
  naked: ['oil_change', 'chain_lube', 'brake_pad_wear', 'air_filter_service', 'tire_wear'],
  adventure: ['oil_change', 'chain_lube', 'brake_pad_wear', 'air_filter_service', 'tire_wear'],
  scooter: ['oil_change', 'brake_pad_wear', 'air_filter_service', 'tire_wear', 'cvt_belt_cleaning'],
};

export function getDefaultMaintenancePresets(category: Bike['category']): MaintenancePresetKey[] {
  return defaultByCategory[category];
}

export function getVisibleMaintenancePresets(category: Bike['category']): MaintenancePresetKey[] {
  return (Object.keys(maintenancePresetCatalog) as MaintenancePresetKey[]).filter((key) => {
    const preset = maintenancePresetCatalog[key];
    return !preset.categories || preset.categories.includes(category);
  });
}

export function getRideModeLabel(mode: RideMode): string {
  return mode === 'weekend' ? 'Weekend Twisties' : 'Daily Ride';
}
