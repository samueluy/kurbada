import { Stack } from 'expo-router';

import { palette } from '@/constants/theme';

export default function PublicLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.background } }} />;
}
