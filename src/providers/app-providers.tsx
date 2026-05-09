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
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { palette } from '@/constants/theme';
import { env } from '@/lib/env';
import { getMapboxModule } from '@/lib/mapbox';
import { queryClient } from '@/lib/query-client';
import { supabase } from '@/lib/supabase';
import { configureRevenueCat, subscribeToCustomerInfo, syncRevenueCatIdentity } from '@/services/revenuecat';

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
  const [bootTimeoutReached, setBootTimeoutReached] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setBootTimeoutReached(true);
      SplashScreen.hideAsync().catch(() => undefined);
    }, 2600);

    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(palette.background).catch(() => undefined);
    configureRevenueCat().catch(() => undefined);
    const unsubscribeCustomerInfo = subscribeToCustomerInfo(() => {
      void queryClient.invalidateQueries({ queryKey: ['access'] });
    });

    if (env.mapboxToken) {
      if (Platform.OS !== 'web') {
        const Mapbox = getMapboxModule();
        Mapbox?.setAccessToken(env.mapboxToken);
      }
    }

    if (!supabase) {
      return () => {
        unsubscribeCustomerInfo();
      };
    }

    supabase.auth.getSession().then(({ data }) => {
      void syncRevenueCatIdentity(data.session?.user.id ?? null);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      void syncRevenueCatIdentity(session?.user.id ?? null);
    });

    return () => {
      unsubscribeCustomerInfo();
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsLoaded]);

  if (!fontsLoaded && !bootTimeoutReached) {
    return (
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: palette.background }}>
        <SafeAreaProvider>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: palette.background }}>
            <StatusBar style="light" translucent backgroundColor="transparent" />
            <ActivityIndicator size="small" color={palette.textSecondary} />
            <AppText variant="meta" style={{ color: palette.textSecondary }}>
              Waking up Kurbada…
            </AppText>
          </View>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <BottomSheetModalProvider>
            <StatusBar style="light" translucent backgroundColor="transparent" />
            {children}
          </BottomSheetModalProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
