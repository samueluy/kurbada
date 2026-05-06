import type { Bike, EmergencyInfo, FuelLog, MaintenanceTask, Profile, RideRecord } from '@/types/domain';
import { buildRouteGeoJson, computeRouteBounds } from '@/lib/route';

const samplePoints = [
  { latitude: 14.5995, longitude: 120.9842, timestamp: Date.now() - 500000, speedKmh: 42 },
  { latitude: 14.601, longitude: 120.986, timestamp: Date.now() - 300000, speedKmh: 56 },
  { latitude: 14.604, longitude: 120.992, timestamp: Date.now() - 100000, speedKmh: 48 },
];

const sampleRoute = buildRouteGeoJson(samplePoints);
export const SAMPLE_BIKE_ID = '8f4d830d-bf86-4d76-b5df-011c88f8cfe0';
const SAMPLE_RIDE_ID = 'ec84a0dc-4766-40ab-bde5-a323cc3df2c0';
const SAMPLE_FUEL_ID = '2c63d0ad-d2a7-4582-a6b9-f48f7b0c45e4';
const SAMPLE_EMERGENCY_ID = '3df7fe44-6dd3-4cb6-8dfe-e1f83aa4f44a';

export const sampleProfile: Profile = {
  id: '9cf2d582-9504-4e0a-a564-5c68fa237f71',
  display_name: 'Samuel Rider',
  member_since: '2026-05-01',
  subscription_status: 'trialing',
  access_override: 'development',
};

export const sampleBikes: Bike[] = [
  {
    id: SAMPLE_BIKE_ID,
    make: 'Kawasaki',
    model: 'Z400',
    year: 2023,
    engine_cc: 399,
    current_odometer_km: 12840,
    category: 'naked',
    mount_profile_id: 'tank-center',
  },
];

export const sampleMaintenanceTasks: MaintenanceTask[] = [
  {
    id: '5239af19-cf2d-4c0f-80da-4e3c8da52e33',
    bike_id: SAMPLE_BIKE_ID,
    task_name: 'Engine Oil Change',
    interval_km: 3000,
    last_done_odometer_km: 10840,
    last_done_date: '2026-03-15',
  },
  {
    id: '469f56d8-757d-4d31-b6de-9cec3c91a7ab',
    bike_id: SAMPLE_BIKE_ID,
    task_name: 'Chain Tension & Lube',
    interval_km: 600,
    last_done_odometer_km: 12480,
    last_done_date: '2026-04-25',
  },
];

export const sampleRides: RideRecord[] = [
  {
    id: SAMPLE_RIDE_ID,
    bike_id: SAMPLE_BIKE_ID,
    mode: 'weekend',
    started_at: new Date(Date.now() - 3_600_000).toISOString(),
    ended_at: new Date(Date.now() - 2_700_000).toISOString(),
    distance_km: 42.8,
    max_speed_kmh: 118,
    avg_speed_kmh: 62,
    max_lean_angle_deg: 34,
    fuel_used_liters: 1.8,
    route_geojson: sampleRoute,
    route_point_count_raw: samplePoints.length,
    route_point_count_simplified: samplePoints.length,
    route_bounds: computeRouteBounds(samplePoints),
  },
];

export const sampleFuelLogs: FuelLog[] = [
  {
    id: SAMPLE_FUEL_ID,
    bike_id: SAMPLE_BIKE_ID,
    logged_at: '2026-05-02',
    liters: 7.2,
    price_per_liter: 66,
    total_cost: 475.2,
    octane_rating: 95,
    station_name: 'Shell Katipunan',
  },
];

export const sampleEmergencyInfo: EmergencyInfo = {
  id: SAMPLE_EMERGENCY_ID,
  full_name: 'Samuel Uy',
  blood_type: 'O+',
  allergies: 'None reported',
  conditions: 'None reported',
  contact1_name: 'Emergency Contact',
  contact1_phone: '+639171112233',
  contact2_name: 'Secondary Contact',
  contact2_phone: '+639189998877',
};
