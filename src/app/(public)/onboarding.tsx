import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { AppScreen } from '@/components/ui/app-screen';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { ProgressDots } from '@/components/ui/progress-dots';
import { palette } from '@/constants/theme';

const slides = [
  { icon: 'speedometer-outline', title: 'Ride deeper', body: 'Track weekend runs with lean angle, speed, and map traces built for motorcycle rhythm.' },
  { icon: 'water-outline', title: 'Know your costs', body: 'Keep a clean fuel ledger with octane notes, spend trends, and distance efficiency.' },
  { icon: 'shield-checkmark-outline', title: 'Stay ready', body: 'Save emergency info, build a QR wallpaper, and keep ride essentials close.' },
] as const;

export default function OnboardingScreen() {
  const [index, setIndex] = useState(0);
  const slide = slides[index];

  return (
    <AppScreen style={{ justifyContent: 'center' }}>
      <GlassCard style={{ minHeight: '82%', justifyContent: 'space-between', paddingVertical: 32, paddingHorizontal: 24 }}>
        <View style={{ alignItems: 'center', gap: 24 }}>
          <ProgressDots total={6} current={index} />
          <Ionicons name={slide.icon} size={112} color={palette.text} />
          <View style={{ alignItems: 'center', gap: 12 }}>
            <AppText variant="screenTitle" style={{ textAlign: 'center', fontSize: 30 }}>
              {slide.title}
            </AppText>
            <AppText variant="meta" style={{ textAlign: 'center', color: palette.textSecondary }}>
              {slide.body}
            </AppText>
          </View>
        </View>

        <View style={{ gap: 18 }}>
          <Button
            title={index === slides.length - 1 ? 'Continue' : 'Next'}
            onPress={() => {
              if (index === slides.length - 1) {
                router.replace('/(public)/bike-setup?flow=onboarding');
              } else {
                setIndex((value) => value + 1);
              }
            }}
          />
        </View>
      </GlassCard>
    </AppScreen>
  );
}
