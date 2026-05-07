export type RideMode = 'weekend' | 'hustle';

export type RideSessionState =
  | 'idle'
  | 'starting'
  | 'calibrating'
  | 'active'
  | 'stopping'
  | 'saving';

export type SubscriptionStatus = 'inactive' | 'trialing' | 'active' | 'grace_period' | 'canceled';

export type AccessOverride = 'none' | 'development' | 'apple_review' | 'closed_testing';

export type ReferralStatus = 'pending' | 'rewarded' | 'rejected';

export type UnitsPreference = 'metric' | 'imperial';

export type LanguagePreference = 'en' | 'fil';

export type LeanCalibration = {
  zeroRollDeg: number;
  capturedAt: string;
  mountProfileId?: string;
};

export type Bike = {
  id: string;
  user_id?: string;
  make: string;
  model: string;
  year: number;
  engine_cc: number;
  current_odometer_km: number;
  category: 'sport' | 'naked' | 'adventure' | 'scooter';
  mount_profile_id?: string;
  created_at?: string;
};

export type MaintenanceTask = {
  id: string;
  bike_id: string;
  task_name: string;
  interval_km: number;
  interval_days: number | null;
  last_done_odometer_km: number;
  last_done_date: string;
};

export type FuelLog = {
  id: string;
  user_id?: string;
  bike_id: string;
  logged_at: string;
  liters: number;
  price_per_liter: number;
  total_cost: number;
  octane_rating: 91 | 95 | 97 | 100;
  station_name?: string;
};

export type RouteBounds = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

export type RidePace = 'chill' | 'moderate' | 'sporty';

export type RideListing = {
  id: string;
  host_user_id: string;
  meetup_point: string;
  meetup_coordinates?: { lat: number; lng: number } | null;
  destination: string;
  ride_date: string;
  pace: RidePace;
  lobby_link: string;
  is_reported: boolean;
  display_name: string;
  created_at: string;
};

export type RideRecord = {
  id: string;
  user_id?: string;
  bike_id: string;
  mode: RideMode;
  started_at: string;
  ended_at: string;
  distance_km: number;
  max_speed_kmh: number;
  avg_speed_kmh: number;
  max_lean_angle_deg?: number | null;
  fuel_used_liters?: number | null;
  route_geojson: GeoJSON.Feature<GeoJSON.LineString>;
  route_point_count_raw: number;
  route_point_count_simplified: number;
  route_bounds: RouteBounds;
};

export type EmergencyBloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

export type EmergencyInfo = {
  id: string;
  user_id?: string;
  full_name: string;
  blood_type: EmergencyBloodType;
  allergies: string;
  conditions: string;
  contact1_name: string;
  contact1_phone: string;
  contact2_name: string;
  contact2_phone: string;
};

export type Profile = {
  id: string;
  display_name: string;
  avatar_url?: string | null;
  created_at?: string;
  member_since?: string;
  subscription_status: SubscriptionStatus;
  subscription_expires_at?: string | null;
  access_override: AccessOverride;
  referral_code: string;
};

export type ReferralRecord = {
  id: string;
  referrer_user_id: string;
  referred_user_id: string;
  referral_code: string;
  referred_display_name?: string | null;
  status: ReferralStatus;
  rewarded_at?: string | null;
  notified_at?: string | null;
  created_at: string;
};

export type RidePoint = {
  latitude: number;
  longitude: number;
  timestamp: number;
  speedKmh: number;
  altitude?: number | null;
};

export type WeatherData = {
  temperature: number;
  weatherCode: number;
  weatherLabel: string;
  weatherIcon: string;
  windSpeed: number;
  sunrise: string;
  sunset: string;
  tempMax: number;
  tempMin: number;
  precipProb: number;
  locationName: string;
};
