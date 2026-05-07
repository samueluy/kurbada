import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { QueryClientProvider } from '@tanstack/react-query';
import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import {
  DMSans_400Regular,
  DMSans_600SemiBold,
  DMSans_700Bold,
  DMSans_900Black,
} from '@expo-google-fonts/dm-sans';
import { DMMono_500Medium } from '@expo-google-fonts/dm-mono';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { palette } from '@/constants/theme';
import { env } from '@/lib/env';
import { getMapboxModule } from '@/lib/mapbox';
import { queryClient } from '@/lib/query-client';
import { supabase } from '@/lib/supabase';
import { configureRevenueCat, syncRevenueCatIdentity } from '@/services/revenuecat';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_600SemiBold,
    DMSans_700Bold,
    DMSans_900Black,
    DMMono_500Medium,
    BebasNeue_400Regular,
  });

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(palette.background).catch(() => undefined);
    configureRevenueCat().catch(() => undefined);

    if (env.mapboxToken) {
      if (Platform.OS !== 'web') {
        const Mapbox = getMapboxModule();
        Mapbox?.setAccessToken(env.mapboxToken);
      }
    }

    if (!supabase) {
      return undefined;
    }

    supabase.auth.getSession().then(({ data }) => {
      void syncRevenueCatIdentity(data.session?.user.id ?? null);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      void syncRevenueCatIdentity(session?.user.id ?? null);
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <BottomSheetModalProvider>{children}</BottomSheetModalProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
