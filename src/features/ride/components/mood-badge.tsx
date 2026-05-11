import { CloudLightning, Flame, Leaf, Minus, Mountain, type LucideIcon } from 'lucide-react-native';
import { View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { radius } from '@/constants/theme';
import { getMoodOption } from '@/lib/mood';
import type { RideMood } from '@/types/domain';

const iconMap: Record<string, LucideIcon> = {
  Flame,
  Mountain,
  Leaf,
  CloudLightning,
  Minus,
};

export function MoodBadge({ mood, size = 'sm' }: { mood: RideMood | null | undefined; size?: 'sm' | 'md' }) {
  const option = getMoodOption(mood);
  if (!option) return null;
  const Icon = iconMap[option.icon];
  const iconSize = size === 'md' ? 14 : 11;
  const fontSize = size === 'md' ? 12 : 10;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: radius.xs,
        backgroundColor: `${option.color}22`,
      }}>
      <Icon size={iconSize} color={option.color} />
      <AppText variant="label" style={{ color: option.color, fontSize, letterSpacing: 0.6 }}>
        {option.label.toUpperCase()}
      </AppText>
    </View>
  );
}
