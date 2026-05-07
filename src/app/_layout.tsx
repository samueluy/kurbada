import { Stack } from 'expo-router';
import React from 'react';

import { palette } from '@/constants/theme';
import '@/tasks/location-task';
import { AppProviders } from '@/providers/app-providers';

export default function RootLayout() {
  return (
    <AppProviders>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: palette.background },
        }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(public)" />
        <Stack.Screen name="(app)" />
      </Stack>
    </AppProviders>
  );
}
