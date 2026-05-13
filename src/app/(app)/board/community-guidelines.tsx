import { router } from 'expo-router';
import { ScrollView, View } from 'react-native';

import { AppScrollScreen } from '@/components/ui/app-screen';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { palette, radius } from '@/constants/theme';
import { useAppStore } from '@/store/app-store';

const rules: { title: string; body: string }[] = [
  {
    title: 'Safety first, always',
    body: 'Helmet + jacket + gloves are required. Never race on public roads. Stop every 60–90 minutes. Ride at the pace of the slowest rider.',
  },
  {
    title: 'No discrimination',
    body: 'Kurbada is open to every rider regardless of gender, religion, tribe, or bike brand. Slurs, harassment, or targeted attacks = instant ban.',
  },
  {
    title: 'No illegal activity',
    body: 'No unregistered bikes, no reckless driving, no lane-splitting past legal limits, no impaired riding. Lobbies coordinating illegal rides will be removed.',
  },
  {
    title: 'Respect meetup hosts',
    body: 'Show up on time or message the host. Don\u2019t crash private group rides uninvited. If a lobby has a cap, respect it.',
  },
  {
    title: 'Hosts are not rescue crews',
    body: 'Each rider is responsible for their own safety, gear, and bike condition. Hosts facilitate the meetup\u2014they do not owe you recovery, fuel, or repairs.',
  },
  {
    title: 'Report abuse',
    body: 'Tap the flag icon on any listing to report it. Listings with 3+ reports are auto-hidden within 24 hours. You can also block users whose content you don\u2019t want to see.',
  },
  {
    title: 'No spam, no scams',
    body: 'One-tap paid promotion links, MLM pitches, or repeated duplicate posts will be removed. Kurbada staff may require verification before re-listing.',
  },
];

export default function CommunityGuidelinesScreen() {
  const setHasSeenCommunityGuidelines = useAppStore((s) => s.setHasSeenCommunityGuidelines);

  const handleAccept = () => {
    setHasSeenCommunityGuidelines(true);
    router.back();
  };

  return (
    <AppScrollScreen contentContainerStyle={{ flexGrow: 1, paddingTop: 14 }} showWordmark={false}>
      <View style={{ gap: 8 }}>
        <AppText variant="eyebrow">Community Guidelines</AppText>
        <AppText variant="screenTitle" style={{ fontSize: 28 }}>
          Ride honest. Ride safe.
        </AppText>
        <AppText variant="body" style={{ color: palette.textSecondary }}>
          Kurbada Lobby is a community space for riders to coordinate group rides. Before you post or join, read these rules. Violations can result in listing removal or a permanent ban.
        </AppText>
      </View>

      <ScrollView contentContainerStyle={{ gap: 10, paddingTop: 4 }} showsVerticalScrollIndicator={false}>
        {rules.map((r, i) => (
          <GlassCard key={r.title} style={{ padding: 16, gap: 6, borderRadius: radius.lg }}>
            <AppText variant="bodyBold" style={{ fontSize: 15 }}>
              {i + 1}. {r.title}
            </AppText>
            <AppText variant="meta" style={{ color: palette.textSecondary, lineHeight: 18 }}>
              {r.body}
            </AppText>
          </GlassCard>
        ))}

        <GlassCard style={{ padding: 16, gap: 6, borderRadius: radius.lg, borderColor: palette.danger, borderWidth: 0.5 }}>
          <AppText variant="label" style={{ color: palette.danger }}>
            DISCLAIMER
          </AppText>
          <AppText variant="meta" style={{ color: palette.textSecondary, lineHeight: 18 }}>
            Kurbada is a coordination tool. We do not organize, supervise, or take responsibility for any ride, its participants, or any incidents that occur. Every rider assumes full personal and legal responsibility for their participation.
          </AppText>
        </GlassCard>
      </ScrollView>

      <View style={{ gap: 8, paddingTop: 12 }}>
        <Button title="I agree — continue to Lobby" onPress={handleAccept} style={{ backgroundColor: palette.danger }} />
        <Button title="Go back" variant="ghost" onPress={() => router.back()} />
      </View>
    </AppScrollScreen>
  );
}
