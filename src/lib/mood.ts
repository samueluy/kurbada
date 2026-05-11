import type { RideMood } from '@/types/domain';

export type MoodOption = {
  id: RideMood;
  label: string;
  /** lucide-react-native icon name */
  icon: 'Flame' | 'Mountain' | 'Leaf' | 'CloudLightning' | 'Minus';
  color: string;
};

export const moodOptions: MoodOption[] = [
  { id: 'send_it', label: 'Send it', icon: 'Flame', color: '#E63946' },
  { id: 'epic', label: 'Epic', icon: 'Mountain', color: '#F39C12' },
  { id: 'chill', label: 'Chill', icon: 'Leaf', color: '#2ECC71' },
  { id: 'brutal', label: 'Brutal', icon: 'CloudLightning', color: '#8E44AD' },
  { id: 'meh', label: 'Meh', icon: 'Minus', color: '#7F8C8D' },
];

export function getMoodOption(mood: RideMood | null | undefined): MoodOption | null {
  if (!mood) return null;
  return moodOptions.find((m) => m.id === mood) ?? null;
}
