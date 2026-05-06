import { Stack } from 'expo-router';
import React from 'react';

import { AppProviders } from '@/providers/app-providers';

export default function RootLayout() {
  return (
    <AppProviders>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(public)" />
        <Stack.Screen name="(app)" />
      </Stack>
    </AppProviders>
  );
}
