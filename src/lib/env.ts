const getEnv = (key: string) => process.env[key];

export const env = {
  supabaseUrl: getEnv('EXPO_PUBLIC_SUPABASE_URL') ?? '',
  supabasePublishableKey: getEnv('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY') ?? '',
  mapboxToken: getEnv('EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN') ?? '',
  revenueCatIosKey: getEnv('EXPO_PUBLIC_REVENUECAT_IOS_KEY') ?? '',
  revenueCatAndroidKey: getEnv('EXPO_PUBLIC_REVENUECAT_ANDROID_KEY') ?? '',
  revenueCatEnabled: getEnv('EXPO_PUBLIC_REVENUECAT_ENABLED') === 'true',
  devBypassAppGate: getEnv('EXPO_PUBLIC_DEV_BYPASS_APP_GATE') === 'true',
};

export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabasePublishableKey);
