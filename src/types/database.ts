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
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          subscription_status?: SubscriptionStatus;
          subscription_expires_at?: string | null;
          access_override?: AccessOverride;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      bikes: {
        Row: {
          id: string;
          user_id: string;
          make: string;
          model: string;
          year: number;
          engine_cc: number;
          current_odometer_km: number;
          mount_profile_id: string | null;
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
          meetup_point: string;
          meetup_coordinates: Json | null;
          destination: string;
          ride_date: string;
          pace: 'chill' | 'moderate' | 'sporty';
          lobby_link: string;
          is_reported: boolean;
          display_name: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['ride_listings']['Row'], 'id' | 'created_at' | 'is_reported'> & {
          id?: string;
          created_at?: string;
          is_reported?: boolean;
        };
        Update: Partial<Database['public']['Tables']['ride_listings']['Insert']>;
      };
    };
  };
};
