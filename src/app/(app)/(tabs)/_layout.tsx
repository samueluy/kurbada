import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, palette } from '@/constants/theme';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { triggerLightHaptic } from '@/lib/haptics';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenListeners={{
        tabPress: () => {
          triggerLightHaptic();
        },
      }}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: palette.background },
        tabBarActiveTintColor: Colors.t1,
        tabBarInactiveTintColor: Colors.t3,
        tabBarStyle: {
          backgroundColor: 'rgba(10,10,10,0.96)',
          borderTopColor: Colors.border,
          borderTopWidth: 0.5,
          height: 58 + Math.max(insets.bottom, 10),
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 10),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          marginBottom: 2,
        },
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="ride"
        options={{
          title: 'Ride',
          tabBarIcon: ({ color, size }) => <Ionicons name="speedometer" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="garage"
        options={{
          title: 'Garage',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="garage-variant" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="board"
        options={{
          title: 'Lobby',
          tabBarIcon: ({ color, size }) => <Ionicons name="radio-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="fuel"
        options={{
          title: 'Fuel',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="gas-station-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
