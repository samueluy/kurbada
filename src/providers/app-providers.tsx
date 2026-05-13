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
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { palette } from '@/constants/theme';
import { useAuth, AuthProvider } from '@/hooks/use-auth';
import { env } from '@/lib/env';
import { getMapboxModule } from '@/lib/mapbox';
import { queryClient } from '@/lib/query-client';
import { initializeRidePointStorage } from '@/lib/ride-point-storage';
import { OnboardingSyncBridge } from '@/providers/onboarding-sync-bridge';
import { DailySummaryBridge } from '@/providers/daily-summary-bridge';
import { EngagementNotificationsBridge } from '@/providers/engagement-notifications-bridge';
import { PendingRideSyncBridge } from '@/providers/pending-ride-sync-bridge';
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

function RevenueCatIdentityBridge() {
  const { session } = useAuth();

  useEffect(() => {
    void syncRevenueCatIdentity(session?.user.id ?? null);
  }, [session?.user.id]);

  return null;
}

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
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('kurbada-reminders', {
        name: 'Kurbada Reminders',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 180, 80, 180],
        lightColor: '#E63946',
      }).catch(() => undefined);
    }
    const unsubscribeCustomerInfo = subscribeToCustomerInfo(() => {
      void queryClient.invalidateQueries({ queryKey: ['access'] });
    });

    if (env.mapboxToken) {
      if (Platform.OS !== 'web') {
        const Mapbox = getMapboxModule();
        Mapbox?.setAccessToken(env.mapboxToken);
      }
    }

    void initializeRidePointStorage();

    return () => {
      unsubscribeCustomerInfo();
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
          <AuthProvider>
            <BottomSheetModalProvider>
              <StatusBar style="light" translucent backgroundColor="transparent" />
              <ErrorBoundary>
                <RevenueCatIdentityBridge />
                <OnboardingSyncBridge />
                <DailySummaryBridge />
                <EngagementNotificationsBridge />
                <PendingRideSyncBridge />
                {children}
              </ErrorBoundary>
            </BottomSheetModalProvider>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
