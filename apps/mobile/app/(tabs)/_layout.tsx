import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { CalendarClock, LayoutGrid, Radio, User, Home } from 'lucide-react-native';
import { color, font } from '../../src/theme/tokens';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: color.accent,
        tabBarInactiveTintColor: color.fgSubtle,
        tabBarStyle: {
          backgroundColor: color.surface,
          borderTopColor: color.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontFamily: font.body.medium,
          fontSize: 11,
          letterSpacing: 0.2,
        },
        sceneStyle: { backgroundColor: color.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color: c, size }) => (
            <Home size={size ?? 22} color={c} strokeWidth={2.1} />
          ),
        }}
      />
      <Tabs.Screen
        name="deterrent"
        options={{
          title: 'Deterrent',
          tabBarIcon: ({ color: c, size }) => (
            <Radio size={size ?? 22} color={c} strokeWidth={2.1} />
          ),
        }}
      />
      <Tabs.Screen
        name="zones"
        options={{
          title: 'Zones',
          tabBarIcon: ({ color: c, size }) => (
            <LayoutGrid size={size ?? 22} color={c} strokeWidth={2.1} />
          ),
        }}
      />
      <Tabs.Screen
        name="schedules"
        options={{
          title: 'Schedules',
          tabBarIcon: ({ color: c, size }) => (
            <CalendarClock size={size ?? 22} color={c} strokeWidth={2.1} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color: c, size }) => (
            <User size={size ?? 22} color={c} strokeWidth={2.1} />
          ),
        }}
      />
    </Tabs>
  );
}
