import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AppText } from '@/components/ui/app-text';
import { AppScreen } from '@/components/ui/app-screen';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { palette } from '@/constants/theme';
import { useAppStore } from '@/store/app-store';

const weekendFeatures = [
  { icon: 'speedometer-outline', title: 'Lean Angle Tracking', body: 'Real-time motorcycle telemetry with gyroscope and accelerometer fusion.' },
  { icon: 'map-outline', title: 'Twisty Route Mapping', body: 'Mapbox-powered route traces with elevation and corner density.' },
  { icon: 'camera-outline', title: 'IG Story Exporting', body: 'Turn your best runs into shareable ride cards for social media.' },
];

const dailyFeatures = [
  { icon: 'water-outline', title: 'Automated Fuel Ledger', body: 'Log fill-ups, track spending, and monitor fuel economy over time.' },
  { icon: 'build-outline', title: 'Maintenance Alerts', body: 'Get reminders for oil changes, chain tension, brake fluid, and more.' },
  { icon: 'location-outline', title: 'Emergency Gas Finder', body: 'Locate the nearest gas station when you&apos;re running low on the road.' },
];

function FeatureRow({ icon, title, body, index }: { icon: string; title: string; body: string; index: number }) {
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 400).duration(400)}
      style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
        <Ionicons name={icon as any} size={22} color={palette.lime} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <AppText variant="bodyBold">{title}</AppText>
        <AppText variant="meta" style={{ color: palette.textSecondary }}>{body}</AppText>
      </View>
    </Animated.View>
  );
}

export default function OnboardingFeaturesScreen() {
  const setOnboardingStep = useAppStore((state) => state.setOnboardingStep);
  const onboardingData = useAppStore((state) => state.onboardingData);
  const isWeekend = onboardingData.ridingStyle === 'weekend';
  const features = isWeekend ? weekendFeatures : dailyFeatures;
  const [revealCount, setRevealCount] = useState(0);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setRevealCount((prev) => {
        const next = prev + 1;
        if (next >= features.length) {
          clearInterval(interval);
          setTimeout(() => setShowButton(true), 300);
        }
        return next;
      });
    }, 500);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AppScreen style={{ justifyContent: 'center' }}>
      <GlassCard style={{ minHeight: '78%', justifyContent: 'space-between', paddingVertical: 36, paddingHorizontal: 24 }}>
        <View style={{ gap: 28 }}>
          <View style={{ alignItems: 'center', gap: 10 }}>
            <AppText variant="label" style={{ color: palette.textSecondary }}>
              Step 5 of 8
            </AppText>
            <AppText variant="screenTitle" style={{ textAlign: 'center', fontSize: 28 }}>
              {isWeekend ? 'Weekend Arsenal' : 'Daily Arsenal'}
            </AppText>
            <AppText variant="meta" style={{ textAlign: 'center', color: palette.textSecondary }}>
              {isWeekend
                ? 'Everything you need for the twisties.'
                : 'Everything you need for the daily grind.'}
            </AppText>
          </View>

          <View style={{ gap: 18 }}>
            {features.slice(0, revealCount).map((feature, i) => (
              <FeatureRow key={feature.title} {...feature} index={i} />
            ))}
          </View>
        </View>

        {showButton && (
          <Animated.View entering={FadeInDown.duration(300)}>
            <Button
              title="Next →"
              onPress={() => {
                setOnboardingStep(6);
                router.replace('/(public)/permissions' as any);
              }}
            />
          </Animated.View>
        )}
      </GlassCard>
    </AppScreen>
  );
}
