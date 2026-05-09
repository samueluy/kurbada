import type { RideRecord } from '@/types/domain';

export type RideStoryTemplateId =
  | 'distance_hero'
  | 'max_lean_hero'
  | 'top_speed_hero'
  | 'route_stats'
  | 'fuel_burn';

export const rideStoryTemplates: {
  id: RideStoryTemplateId;
  label: string;
}[] = [
  { id: 'distance_hero', label: 'Distance Hero' },
  { id: 'max_lean_hero', label: 'Max Lean Hero' },
  { id: 'top_speed_hero', label: 'Top Speed Hero' },
  { id: 'route_stats', label: 'Route + Stats' },
  { id: 'fuel_burn', label: 'Cost Per Run' },
];

export function getRideStoryTitle(ride: RideRecord) {
  const dateLabel = new Date(ride.started_at).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
  });
  return `${ride.mode === 'weekend' ? 'Weekend Run' : 'Daily Run'} · ${dateLabel}`;
}

export function getRideStoryPrimaryValue(
  ride: RideRecord,
  templateId: RideStoryTemplateId,
  fuelPricePerLiter?: number,
): { value: string; unit: string; subtitle: string } {
  switch (templateId) {
    case 'distance_hero':
      return {
        value: ride.distance_km.toFixed(1),
        unit: 'KM',
        subtitle: 'Distance covered in this run',
      };
    case 'max_lean_hero':
      return {
        value: (ride.max_lean_angle_deg ?? 0).toFixed(0),
        unit: '°',
        subtitle: ride.max_lean_angle_deg ? 'Maximum lean angle hit' : 'Lean angle not captured this ride',
      };
    case 'top_speed_hero':
      return {
        value: ride.max_speed_kmh.toFixed(0),
        unit: 'KM/H',
        subtitle: 'Top speed recorded',
      };
    case 'fuel_burn': {
      if (ride.fuel_used_liters && fuelPricePerLiter) {
        return {
          value: `₱${(ride.fuel_used_liters * fuelPricePerLiter).toFixed(0)}`,
          unit: '',
          subtitle: `${ride.fuel_used_liters.toFixed(1)}L burned at ₱${fuelPricePerLiter.toFixed(2)}/L`,
        };
      }

      return {
        value: (ride.fuel_used_liters ?? 0).toFixed(1),
        unit: 'L',
        subtitle: 'Estimated fuel burned this ride',
      };
    }
    case 'route_stats':
      return {
        value: ride.distance_km.toFixed(1),
        unit: 'KM',
        subtitle: 'Route summary with ride stats',
      };
    default:
      return {
        value: ride.distance_km.toFixed(1),
        unit: 'KM',
        subtitle: 'Distance covered in this run',
      };
  }
}
