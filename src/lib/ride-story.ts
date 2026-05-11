import type { RideRecord } from '@/types/domain';

export type RideStoryTemplateId =
  | 'distance_hero'
  | 'top_speed_hero'
  | 'route_stats'
  | 'fuel_burn'
  | 'minimal_mono'
  | 'center_hero';

export type RideStoryLayout =
  | 'corner-tl'
  | 'corner-tr'
  | 'center'
  | 'bottom-band'
  | 'left-rail';

export type RideStoryTemplate = {
  id: RideStoryTemplateId;
  label: string;
  layout: RideStoryLayout;
};

export const rideStoryTemplates: RideStoryTemplate[] = [
  { id: 'distance_hero', label: 'Distance', layout: 'corner-tl' },
  { id: 'fuel_burn', label: 'Cost/Run', layout: 'corner-tr' },
  { id: 'top_speed_hero', label: 'Top Speed', layout: 'center' },
  { id: 'route_stats', label: 'Route', layout: 'bottom-band' },
  { id: 'minimal_mono', label: 'Minimal', layout: 'left-rail' },
  { id: 'center_hero', label: 'Centered', layout: 'center' },
];

export function getRideStoryTemplate(id: RideStoryTemplateId): RideStoryTemplate {
  return rideStoryTemplates.find((t) => t.id === id) ?? rideStoryTemplates[0];
}

export function getRideStoryTitle(ride: RideRecord) {
  const dateLabel = new Date(ride.started_at).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
  });
  return `Ride · ${dateLabel}`;
}

export function getRideStoryPrimaryValue(
  ride: RideRecord,
  templateId: RideStoryTemplateId,
  fuelPricePerLiter?: number,
): { value: string; unit: string; subtitle: string } {
  switch (templateId) {
    case 'distance_hero':
    case 'center_hero':
    case 'minimal_mono':
    case 'route_stats':
      return {
        value: ride.distance_km.toFixed(1),
        unit: 'KM',
        subtitle: 'Distance covered in this run',
      };
    case 'top_speed_hero':
      return {
        value: ride.max_speed_kmh.toFixed(0),
        unit: 'KM/H',
        subtitle: 'Top speed recorded',
      };
    case 'fuel_burn':
      if (ride.fuel_used_liters && fuelPricePerLiter) {
        return {
          value: `₱${(ride.fuel_used_liters * fuelPricePerLiter).toFixed(0)}`,
          unit: '',
          subtitle: `${ride.fuel_used_liters.toFixed(1)}L at ₱${fuelPricePerLiter.toFixed(2)}/L`,
        };
      }
      return {
        value: (ride.fuel_used_liters ?? 0).toFixed(1),
        unit: 'L',
        subtitle: 'Estimated fuel burned this ride',
      };
    default:
      return {
        value: ride.distance_km.toFixed(1),
        unit: 'KM',
        subtitle: 'Distance covered in this run',
      };
  }
}

export function isAccentTemplate(templateId: RideStoryTemplateId): boolean {
  return templateId === 'fuel_burn';
}
