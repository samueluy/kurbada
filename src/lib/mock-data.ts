import type { Bike, EmergencyInfo, FuelLog, MaintenanceTask, Profile, ReferralRecord, RideListing, RideRecord } from '@/types/domain';
import { buildRouteGeoJson, computeRouteBounds } from '@/lib/route';

const samplePoints = [
  { latitude: 14.5995, longitude: 120.9842, timestamp: Date.now() - 500000, speedKmh: 42, rawSpeedKmh: 43, locationAccuracyM: 5 },
  { latitude: 14.601, longitude: 120.986, timestamp: Date.now() - 300000, speedKmh: 56, rawSpeedKmh: 58, locationAccuracyM: 4 },
  { latitude: 14.604, longitude: 120.992, timestamp: Date.now() - 100000, speedKmh: 48, rawSpeedKmh: 49, locationAccuracyM: 6 },
];

const sampleRoute = buildRouteGeoJson(samplePoints);
export const SAMPLE_BIKE_ID = '8f4d830d-bf86-4d76-b5df-011c88f8cfe0';
const SAMPLE_RIDE_ID = 'ec84a0dc-4766-40ab-bde5-a323cc3df2c0';
const SAMPLE_FUEL_ID = '2c63d0ad-d2a7-4582-a6b9-f48f7b0c45e4';
const SAMPLE_EMERGENCY_ID = '3df7fe44-6dd3-4cb6-8dfe-e1f83aa4f44a';

export const sampleProfile: Profile = {
  id: '9cf2d582-9504-4e0a-a564-5c68fa237f71',
  display_name: 'Demo Rider',
  member_since: '2026-05-01',
  subscription_status: 'trialing',
  access_override: 'development',
  referral_code: 'DEMO9F71',
};

export const sampleBikes: Bike[] = [
  {
    id: SAMPLE_BIKE_ID,
    make: 'Kawasaki',
    model: 'Z400',
    nickname: 'The Red One',
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
    cost: 800,
    interval_km: 3000,
    interval_days: 180,
    last_done_odometer_km: 10840,
    last_done_date: '2026-03-15',
  },
  {
    id: '469f56d8-757d-4d31-b6de-9cec3c91a7ab',
    bike_id: SAMPLE_BIKE_ID,
    task_name: 'Chain Tension & Lube',
    cost: 200,
    interval_km: 600,
    interval_days: 90,
    last_done_odometer_km: 12480,
    last_done_date: '2026-04-25',
  },
];

export const sampleRides: RideRecord[] = [
  {
    id: SAMPLE_RIDE_ID,
    bike_id: SAMPLE_BIKE_ID,
    sync_status: 'synced',
    mode: 'weekend',
    started_at: new Date(Date.now() - 3_600_000).toISOString(),
    ended_at: new Date(Date.now() - 2_700_000).toISOString(),
    distance_km: 42.8,
    max_speed_kmh: 118,
    avg_speed_kmh: 62,
    max_lean_angle_deg: null,
    fuel_used_liters: 1.8,
    route_geojson: sampleRoute,
    route_preview_geojson: sampleRoute,
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
  full_name: 'Demo Rider',
  blood_type: 'unknown',
  allergies: 'None reported',
  conditions: 'None reported',
  contact1_name: 'Primary Contact',
  contact1_phone: '+639171112233',
  contact2_name: 'Secondary Contact',
  contact2_phone: '+639189998877',
};

export const sampleRideListings: RideListing[] = [
  {
    id: 'bb4a8f7e-3d56-4bbc-9e1a-94c87d6bc123',
    host_user_id: '9cf2d582-9504-4e0a-a564-5c68fa237f71',
    title: 'Sunday Marilaque Sweep',
    meetup_point: 'Shell Marcos Highway',
    meetup_coordinates: { lat: 14.612, lng: 121.119 },
    destination: 'Marilaque to Infanta',
    ride_date: new Date(Date.now() + 86_400_000 * 3).toISOString(),
    pace: 'moderate',
    lobby_platform: 'messenger',
    lobby_link: 'https://m.me/join/kurbadaride',
    is_reported: false,
    is_hidden: false,
    report_count: 0,
    display_name: 'Demo Rider',
    created_at: new Date().toISOString(),
    is_verified_host: true,
    rsvp_going_count: 2,
    rsvp_maybe_count: 1,
  },
  {
    id: 'cc5b9g8f-4e67-5ccd-0f2b-a5d98e7cd234',
    host_user_id: 'aabbcc-1111-2222-3333-444455556666',
    title: 'Tagaytay Easy Pace',
    meetup_point: 'Petron SLEX',
    meetup_coordinates: { lat: 14.279, lng: 121.037 },
    destination: 'Tagaytay Weekend Run',
    ride_date: new Date(Date.now() + 86_400_000 * 5).toISOString(),
    pace: 'chill',
    lobby_platform: 'telegram',
    lobby_link: 'https://t.me/kurbadatagaytay',
    is_reported: false,
    is_hidden: false,
    report_count: 0,
    display_name: 'Maria Rider',
    created_at: new Date().toISOString(),
    is_verified_host: false,
    rsvp_going_count: 0,
    rsvp_maybe_count: 0,
  },
];

export const sampleReferrals: ReferralRecord[] = [
  {
    id: '5c80d07f-5ca6-4aa7-aa49-a3f808b387f6',
    referrer_user_id: sampleProfile.id,
    referred_user_id: 'b1b4d693-d6a9-4ec9-bca7-9b44d695730d',
    referral_code: sampleProfile.referral_code,
    referred_display_name: 'Leo Rider',
    status: 'rewarded',
    rewarded_at: new Date(Date.now() - 86_400_000).toISOString(),
    notified_at: null,
    created_at: new Date(Date.now() - 172_800_000).toISOString(),
  },
];
