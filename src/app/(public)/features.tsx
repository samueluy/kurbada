import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AppText } from '@/components/ui/app-text';
import { AppScreen } from '@/components/ui/app-screen';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { palette } from '@/constants/theme';
import { getOnboardingRoute, ONBOARDING_TOTAL_STEPS } from '@/lib/onboarding-flow';
import { useAppStore } from '@/store/app-store';

const weekendFeatures = [
  { icon: 'speedometer-outline', title: 'Tilt Sensor', body: 'Track your lean angle in real-time while attacking the twisties.' },
  { icon: 'map-outline', title: 'Route Trace', body: 'See your route on the map — every curve, elevation, and checkpoint.' },
  { icon: 'camera-outline', title: 'IG Story Card', body: 'Turn your best ride into a shareable card. Post on social media.' },
  { icon: 'people-outline', title: 'Ride Lobby', body: 'Plan group rides and join lobbies before the engines fire up.' },
  { icon: 'water-outline', title: 'Fuel Logging', body: 'Log every full tank and track your real-world fuel consumption.' },
  { icon: 'cash-outline', title: 'Cost Per Run', body: 'See estimated pesos per ride so you know the real cost of each trip.' },
];

const dailyFeatures = [
  { icon: 'water-outline', title: 'Fuel Logging', body: 'Track your fuel spending. Log fill-ups and see spending trends over time.' },
  { icon: 'cash-outline', title: 'Cost Per Run', body: 'See estimated fuel cost per ride and daily commute instantly.' },
  { icon: 'build-outline', title: 'Maintenance Alerts', body: 'Oil changes, chain, brakes — reminders keep your bike road-ready.' },
  { icon: 'shield-checkmark-outline', title: 'Emergency QR', body: 'Save emergency contacts and blood type. Generate a QR for your lock screen.' },
  { icon: 'camera-outline', title: 'IG Story Card', body: 'Overlay your ride stats on a gallery photo and share to social media.' },
  { icon: 'bar-chart-outline', title: 'Ride History', body: 'Every ride recorded — route, speed, lean angle. Revisit your best runs.' },
];


function FeatureRow({ icon, title, body, index }: { icon: string; title: string; body: string; index: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 400).duration(400)} style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start' }}>
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
    <AppScreen style={{ padding: 0 }} showWordmark={false}>
      <GlassCard style={{ flex: 1, borderRadius: 0, paddingVertical: 28, paddingHorizontal: 24, gap: 20 }}>
        <ScrollView
          contentContainerStyle={{ gap: 20, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Pressable onPress={() => { setOnboardingStep(4); router.replace(getOnboardingRoute(4) as any); }}>
              <Ionicons name="arrow-back" size={20} color={palette.textSecondary} />
            </Pressable>
            <AppText variant="label" style={{ color: palette.textSecondary }}>Step 5 of {ONBOARDING_TOTAL_STEPS}</AppText>
          </View>

          <View style={{ alignItems: 'center', gap: 10 }}>
            <AppText variant="screenTitle" style={{ textAlign: 'center', fontSize: 28 }}>
              What You Get
            </AppText>
            <AppText variant="meta" style={{ textAlign: 'center', color: palette.textSecondary }}>
              {isWeekend ? 'Everything you need for the twisties.' : 'Everything you need for the daily ride.'}
            </AppText>
          </View>

          <View style={{ gap: 18, minHeight: features.length * 78 }}>
            {features.map((feature, i) => (
              <View key={feature.title} style={{ minHeight: 60, justifyContent: 'center' }}>
                {i < revealCount ? <FeatureRow {...feature} index={i} /> : null}
              </View>
            ))}
          </View>
        </ScrollView>

        {showButton ? (
          <Animated.View entering={FadeInDown.duration(300)}>
            <Button title="Next →" onPress={() => { setOnboardingStep(6); router.push(getOnboardingRoute(6) as any); }} />
          </Animated.View>
        ) : null}
      </GlassCard>
    </AppScreen>
  );
}
