import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AppText } from '@/components/ui/app-text';
import { AppScrollScreen } from '@/components/ui/app-screen';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { palette } from '@/constants/theme';
import { getOnboardingRoute, ONBOARDING_TOTAL_STEPS } from '@/lib/onboarding-flow';
import { useAppStore } from '@/store/app-store';

const weekendFeatures = [
  { icon: 'speedometer-outline', title: 'Tilt Sensor', body: 'Sukatin ang lean angle habang bumibira sa twisties.' },
  { icon: 'map-outline', title: 'Route Trace', body: 'Makikita ang ruta sa mapa. Bawat curve, elevation, at checkpoint.' },
  { icon: 'camera-outline', title: 'IG Story Card', body: 'Gawing shareable card ang best ride mo. I-post sa social media.' },
  { icon: 'people-outline', title: 'Ride Lobby', body: 'Magplano ng group rides at sumali sa lobby bago pa tumunog ang makina.' },
  { icon: 'water-outline', title: 'Fuel Logging', body: 'I-log ang bawat full tank at bantayan ang real-world fuel burn mo.' },
  { icon: 'cash-outline', title: 'Cost Per Run', body: 'Makita ang estimated pesos per ride para alam mo ang tunay na gastos.' },
];

const dailyFeatures = [
  { icon: 'water-outline', title: 'Fuel Logging', body: 'Subaybayan ang gastos sa gasolina. Log kada fill-up, kita ang spending trends.' },
  { icon: 'cash-outline', title: 'Cost Per Run', body: 'Tingnan agad ang estimated fuel cost ng bawat ride at arawang biyahe.' },
  { icon: 'build-outline', title: 'Alagang Motor', body: 'Oil change, kadena, preno — may paalala para laging road-ready.' },
  { icon: 'shield-checkmark-outline', title: 'Emergency QR', body: 'I-save ang emergency contacts at blood type. Generate QR para sa lock screen mo.' },
  { icon: 'camera-outline', title: 'IG Story Card', body: 'I-overlay ang ride stats sa gallery photo mo at i-share agad sa Instagram.' },
  { icon: 'bar-chart-outline', title: 'Ride History', body: 'Lahat ng ride recorded — ruta, bilis, lean angle. Balikan ang best ride mo.' },
  { icon: 'people-outline', title: 'Ride Lobby', body: 'Sumali sa group rides at makipag-coordinate sa lobby bago umalis.' },
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
    <AppScrollScreen contentContainerStyle={{ flexGrow: 1 }}>
      <GlassCard style={{ minHeight: '76%', paddingVertical: 28, paddingHorizontal: 24, gap: 20, justifyContent: 'space-between' }}>
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

        {showButton && (
          <Animated.View entering={FadeInDown.duration(300)}>
            <Button title="Next →" onPress={() => { setOnboardingStep(6); router.push(getOnboardingRoute(6) as any); }} />
          </Animated.View>
        )}
      </GlassCard>
    </AppScrollScreen>
  );
}
