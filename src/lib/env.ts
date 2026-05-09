export const env = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabasePublishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
  mapboxToken: process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '',
  revenueCatIosKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '',
  revenueCatAndroidKey: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '',
  revenueCatEnabled: process.env.EXPO_PUBLIC_REVENUECAT_ENABLED === 'true',
  devBypassAppGate: process.env.EXPO_PUBLIC_DEV_BYPASS_APP_GATE === 'true',
};

export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabasePublishableKey);
