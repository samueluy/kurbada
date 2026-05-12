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
export type MaintenancePresetKey =
  | 'oil_change'
  | 'chain_lube'
  | 'brake_pad_wear'
  | 'air_filter_service'
  | 'tire_wear'
  | 'cvt_belt_cleaning';

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
  nickname?: string | null;
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
  cost?: number | null;
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
export type LobbyPlatform = 'messenger' | 'telegram' | 'none';

export type RideListing = {
  id: string;
  host_user_id: string;
  title?: string | null;
  meetup_point: string;
  meetup_coordinates?: { lat: number; lng: number } | null;
  destination: string;
  ride_date: string;
  pace: RidePace;
  lobby_platform?: LobbyPlatform | null;
  lobby_link?: string | null;
  is_reported: boolean;
  report_count?: number;
  is_hidden?: boolean;
  display_name: string;
  created_at: string;
  city?: string | null;
  photo_urls?: string[] | null;
  is_verified_host?: boolean | null;
  rsvp_going_count?: number;
  rsvp_maybe_count?: number;
};

export type RideRecord = {
  id: string;
  user_id?: string;
  bike_id: string;
  sync_status?: 'synced' | 'pending';
  mode: RideMode;
  started_at: string;
  ended_at: string;
  distance_km: number;
  max_speed_kmh: number;
  avg_speed_kmh: number;
  max_lean_angle_deg?: number | null;
  fuel_used_liters?: number | null;
  elevation_gain_m?: number | null;
  mood?: RideMood | null;
  route_geojson: GeoJSON.Feature<GeoJSON.LineString>;
  route_point_count_raw: number;
  route_point_count_simplified: number;
  route_bounds: RouteBounds;
};

export type RideMood = 'send_it' | 'epic' | 'chill' | 'brutal' | 'meh';

export type GearCategory =
  | 'helmet'
  | 'jacket'
  | 'gloves'
  | 'boots'
  | 'pants'
  | 'tire_front'
  | 'tire_rear'
  | 'chain'
  | 'battery'
  | 'other';

export type GearItem = {
  id: string;
  user_id: string;
  bike_id?: string | null;
  name: string;
  category: GearCategory;
  install_date: string; // ISO date (YYYY-MM-DD)
  install_odometer_km?: number | null;
  expected_lifetime_months?: number | null;
  expected_lifetime_km?: number | null;
  notes?: string | null;
  archived?: boolean;
  created_at?: string;
};

export type EmergencyBloodType = '' | 'unknown' | 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

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
  is_verified_host?: boolean | null;
  home_city?: string | null;
};

export type PlatformTag = 'grab' | 'lalamove' | 'foodpanda' | 'moveit' | 'joyride' | 'other';

export type RideEarnings = {
  id: string;
  user_id: string;
  ride_id?: string | null;
  bike_id?: string | null;
  earned_at: string; // ISO date
  amount: number;
  platform: PlatformTag;
  notes?: string | null;
  created_at?: string;
};

export type RSVPStatus = 'going' | 'maybe';

export type RideRSVP = {
  id: string;
  listing_id: string;
  user_id: string;
  display_name: string;
  status: RSVPStatus;
  created_at?: string;
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
  rawSpeedKmh?: number | null;
  locationAccuracyM?: number | null;
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
