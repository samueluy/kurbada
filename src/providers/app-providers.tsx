import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { Oswald_500Medium, Oswald_600SemiBold } from '@expo-google-fonts/oswald';
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
import { configureRevenueCat } from '@/services/revenuecat';

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
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Oswald_500Medium,
    Oswald_600SemiBold,
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
