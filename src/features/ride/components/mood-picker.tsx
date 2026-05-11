import { CloudLightning, Flame, Leaf, Minus, Mountain, type LucideIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { palette, radius } from '@/constants/theme';
import { moodOptions, type MoodOption } from '@/lib/mood';
import type { RideMood } from '@/types/domain';

const iconMap: Record<MoodOption['icon'], LucideIcon> = {
  Flame,
  Mountain,
  Leaf,
  CloudLightning,
  Minus,
};

export function MoodPicker({
  value,
  onChange,
}: {
  value: RideMood | null;
  onChange: (mood: RideMood) => void;
}) {
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {moodOptions.map((option) => {
          const Icon = iconMap[option.icon];
          const active = value === option.id;
          return (
            <Pressable
              key={option.id}
              onPress={() => onChange(option.id)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingHorizontal: 14,
                paddingVertical: 10,
                borderRadius: radius.pill,
                borderWidth: active ? 1 : 0.5,
                borderColor: active ? option.color : palette.border,
                backgroundColor: active ? `${option.color}22` : 'rgba(255,255,255,0.04)',
              }}>
              <Icon size={16} color={active ? option.color : palette.textSecondary} />
              <AppText
                variant="button"
                style={{ fontSize: 13, color: active ? option.color : palette.textSecondary }}>
                {option.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
