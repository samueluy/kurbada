import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { AppScreen } from '@/components/ui/app-screen';
import { palette } from '@/constants/theme';
import { useAppStore } from '@/store/app-store';

export default function SplashScreen() {
  const setHasSeenSplash = useAppStore((state) => state.setHasSeenSplash);
  const hasCompletedOnboarding = useAppStore((state) => state.hasCompletedOnboarding);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setHasSeenSplash();
      router.replace(hasCompletedOnboarding ? '/(public)/auth/sign-in' : '/(public)/onboarding');
    }, 1800);

    return () => clearTimeout(timeout);
  }, [hasCompletedOnboarding, setHasSeenSplash]);

  return (
    <AppScreen style={{ justifyContent: 'center', alignItems: 'center' }}>
      <LinearGradient colors={['#0A0A0A', '#050505', '#101010']} style={{ position: 'absolute', inset: 0 }} />
      <View style={{ alignItems: 'center', gap: 16 }}>
        <AppText variant="brand" style={{ fontSize: 44, letterSpacing: 7, color: '#F5F5F2' }}>
          KURBADA
        </AppText>
        <View style={{ width: 48, height: 2, backgroundColor: palette.danger }} />
        <AppText variant="meta" style={{ color: palette.textSecondary }}>Built for Filipino Riders</AppText>
      </View>
    </AppScreen>
  );
}
