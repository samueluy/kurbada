import type { AccessOverride, SubscriptionStatus } from '@/types/domain';

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
          subscription_status: SubscriptionStatus;
          subscription_expires_at: string | null;
          access_override: AccessOverride;
          referral_code: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          subscription_status?: SubscriptionStatus;
          subscription_expires_at?: string | null;
          access_override?: AccessOverride;
          referral_code?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      referrals: {
        Row: {
          id: string;
          referrer_user_id: string;
          referred_user_id: string;
          referral_code: string;
          referred_display_name: string | null;
          status: 'pending' | 'rewarded' | 'rejected';
          rewarded_at: string | null;
          notified_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['referrals']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['referrals']['Insert']>;
      };
      revenuecat_webhook_events: {
        Row: {
          event_id: string;
          event_type: string;
          app_user_id: string;
          processed_at: string;
          payload: Json;
        };
        Insert: Database['public']['Tables']['revenuecat_webhook_events']['Row'];
        Update: Partial<Database['public']['Tables']['revenuecat_webhook_events']['Insert']>;
      };
      bikes: {
        Row: {
          id: string;
          user_id: string;
          make: string;
          model: string;
          nickname: string | null;
          year: number;
          engine_cc: number;
          current_odometer_km: number;
          category: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['bikes']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['bikes']['Insert']>;
      };
      maintenance_tasks: {
        Row: {
          id: string;
          bike_id: string;
          task_name: string;
          cost: number | null;
          interval_km: number;
          interval_days: number | null;
          last_done_odometer_km: number;
          last_done_date: string;
        };
        Insert: Omit<Database['public']['Tables']['maintenance_tasks']['Row'], 'id'> & { id?: string };
        Update: Partial<Database['public']['Tables']['maintenance_tasks']['Insert']>;
      };
      rides: {
        Row: {
          id: string;
          user_id: string;
          bike_id: string;
          mode: 'weekend' | 'hustle';
          started_at: string;
          ended_at: string;
          distance_km: number;
          max_speed_kmh: number;
          avg_speed_kmh: number;
          max_lean_angle_deg: number | null;
          fuel_used_liters: number | null;
          route_geojson: Json;
          route_preview_geojson: Json;
          route_point_count_raw: number;
          route_point_count_simplified: number;
          route_bounds: Json;
        };
        Insert: Omit<Database['public']['Tables']['rides']['Row'], 'id'> & { id?: string };
        Update: Partial<Database['public']['Tables']['rides']['Insert']>;
      };
      fuel_logs: {
        Row: {
          id: string;
          user_id: string;
          bike_id: string;
          logged_at: string;
          liters: number;
          price_per_liter: number;
          total_cost: number;
          octane_rating: number;
          station_name: string | null;
        };
        Insert: Omit<Database['public']['Tables']['fuel_logs']['Row'], 'id'> & { id?: string };
        Update: Partial<Database['public']['Tables']['fuel_logs']['Insert']>;
      };
      emergency_info: {
        Row: {
          id: string;
          user_id: string;
          full_name: string;
          blood_type: string;
          allergies: string | null;
          conditions: string | null;
          contact1_name: string;
          contact1_phone: string;
          contact2_name: string | null;
          contact2_phone: string | null;
        };
        Insert: Omit<Database['public']['Tables']['emergency_info']['Row'], 'id'> & { id?: string };
        Update: Partial<Database['public']['Tables']['emergency_info']['Insert']>;
      };
      ride_listings: {
        Row: {
          id: string;
          host_user_id: string;
          title: string | null;
          meetup_point: string;
          meetup_coordinates: Json | null;
          destination: string;
          ride_date: string;
          pace: 'chill' | 'moderate' | 'sporty';
          lobby_platform: 'messenger' | 'telegram' | 'none';
          lobby_link: string | null;
          is_reported: boolean;
          display_name: string;
          created_at: string;
          city: string | null;
          photo_urls: string[] | null;
          report_count: number;
          is_hidden: boolean;
        };
        Insert: Omit<Database['public']['Tables']['ride_listings']['Row'], 'id' | 'created_at' | 'is_reported'> & {
          id?: string;
          created_at?: string;
          is_reported?: boolean;
        };
        Update: Partial<Database['public']['Tables']['ride_listings']['Insert']>;
      };
    };
    Views: {
      ride_listings_feed: {
        Row: {
          id: string;
          host_user_id: string;
          title: string | null;
          meetup_point: string;
          meetup_coordinates: Json | null;
          destination: string;
          ride_date: string;
          pace: 'chill' | 'moderate' | 'sporty';
          lobby_platform: 'messenger' | 'telegram' | 'none';
          lobby_link: string | null;
          is_reported: boolean;
          display_name: string;
          created_at: string;
          city: string | null;
          photo_urls: string[] | null;
          report_count: number;
          is_hidden: boolean;
          is_verified_host: boolean;
          rsvp_going_count: number;
          rsvp_maybe_count: number;
        };
      };
    };
    Functions: {
      ride_dashboard_metrics: {
        Args: { p_user_id?: string };
        Returns: {
          latest_ride_id: string | null;
          latest_ride_distance_km: number;
          latest_ride_max_speed_kmh: number;
          latest_ride_fuel_used_liters: number;
          latest_ride_started_at: string | null;
          latest_fuel_price: number;
          today_earnings: number;
          today_fuel_cost: number;
          today_trip_count: number;
          month_distance_km: number;
          month_fuel_cost: number;
          month_maintenance_accrual: number;
          month_total_cost: number;
          month_cost_per_km: number;
        }[];
      };
      leaderboard_weekly_km: {
        Args: Record<PropertyKey, never>;
        Returns: {
          user_id: string;
          display_name: string;
          total_km: number;
          rank: number;
        }[];
      };
      is_display_name_available: {
        Args: { p_display_name: string; p_exclude_user_id?: string | null };
        Returns: boolean;
      };
      user_maintenance_overview: {
        Args: { p_user_id?: string };
        Returns: {
          id: string;
          bike_id: string;
          task_name: string;
          cost: number | null;
          interval_km: number;
          interval_days: number | null;
          last_done_odometer_km: number;
          last_done_date: string;
          bike_make: string;
          bike_model: string;
          bike_nickname: string | null;
          current_odometer_km: number;
          bike_created_at: string;
        }[];
      };
    };
  };
};
