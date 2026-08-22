import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import {
  CalendarClock,
  Building2,
  Music,
  Settings,
  Home,
} from 'lucide-react-native';
import { useEntitlement } from '../../src/hooks/useEntitlement';
import { color, font } from '../../src/theme/tokens';

const ICON_SIZE = 20;
const ICON_STROKE = 1.75;

export default function TabsLayout() {
  const ent = useEntitlement();
  // Only a Business plan gets the fifth tab. Everyone else finds the same
  // thing under Settings, "For businesses".
  const showPlaces = ent.can('zones');

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color.ink,
        tabBarInactiveTintColor: color.fgSubtle,
        tabBarStyle: {
          backgroundColor: color.background,
          borderTopColor: color.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 84 : 62,
          paddingTop: 8,
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontFamily: font.mono.medium,
          fontSize: 10,
          letterSpacing: 1,
          textTransform: 'uppercase',
        },
        sceneStyle: { backgroundColor: color.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color: c }) => (
            <Home size={ICON_SIZE} color={c} strokeWidth={ICON_STROKE} />
          ),
        }}
      />
      <Tabs.Screen
        name="sounds"
        options={{
          title: 'Sounds',
          tabBarIcon: ({ color: c }) => (
            <Music size={ICON_SIZE} color={c} strokeWidth={ICON_STROKE} />
          ),
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Schedule',
          tabBarIcon: ({ color: c }) => (
            <CalendarClock size={ICON_SIZE} color={c} strokeWidth={ICON_STROKE} />
          ),
        }}
      />
      <Tabs.Screen
        name="places"
        options={{
          title: 'Places',
          href: showPlaces ? undefined : null,
          tabBarIcon: ({ color: c }) => (
            <Building2 size={ICON_SIZE} color={c} strokeWidth={ICON_STROKE} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color: c }) => (
            <Settings size={ICON_SIZE} color={c} strokeWidth={ICON_STROKE} />
          ),
        }}
      />
    </Tabs>
  );
}
