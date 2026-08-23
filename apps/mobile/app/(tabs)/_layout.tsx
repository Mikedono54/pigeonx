import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import {
  Building2,
  CalendarClock,
  House,
  Music,
  Settings,
} from 'lucide-react-native';

import { useEntitlement } from '../../src/hooks/useEntitlement';
import { font, icon, useTheme } from '../../src/theme';

export default function TabsLayout() {
  const ent = useEntitlement();
  const { c } = useTheme();

  // Only a Business plan gets the fifth tab. Everyone else finds the same
  // thing under Settings, "For businesses".
  const showPlaces = ent.can('zones');

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.ink,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: {
          backgroundColor: c.bg,
          borderTopColor: c.ink,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 86 : 64,
          paddingTop: 10,
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontFamily: font.mono.bold,
          fontSize: 10,
          letterSpacing: 1,
          textTransform: 'uppercase',
          marginTop: 2,
        },
        sceneStyle: { backgroundColor: c.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color: tint }) => (
            <House size={icon.md} color={tint} strokeWidth={icon.stroke} />
          ),
        }}
      />
      <Tabs.Screen
        name="sounds"
        options={{
          title: 'Sounds',
          tabBarIcon: ({ color: tint }) => (
            <Music size={icon.md} color={tint} strokeWidth={icon.stroke} />
          ),
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Schedule',
          tabBarIcon: ({ color: tint }) => (
            <CalendarClock size={icon.md} color={tint} strokeWidth={icon.stroke} />
          ),
        }}
      />
      <Tabs.Screen
        name="places"
        options={{
          title: 'Places',
          href: showPlaces ? undefined : null,
          tabBarIcon: ({ color: tint }) => (
            <Building2 size={icon.md} color={tint} strokeWidth={icon.stroke} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color: tint }) => (
            <Settings size={icon.md} color={tint} strokeWidth={icon.stroke} />
          ),
        }}
      />
    </Tabs>
  );
}
