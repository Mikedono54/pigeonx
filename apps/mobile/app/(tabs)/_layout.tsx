import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import {
  CalendarClock,
  LayoutGrid,
  Radio,
  User,
  Home,
} from 'lucide-react-native';
import { color, font } from '../../src/theme/tokens';

const ICON_SIZE = 20;
const ICON_STROKE = 1.75;

export default function TabsLayout() {
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
        name="deterrent"
        options={{
          title: 'Sound',
          tabBarIcon: ({ color: c }) => (
            <Radio size={ICON_SIZE} color={c} strokeWidth={ICON_STROKE} />
          ),
        }}
      />
      <Tabs.Screen
        name="zones"
        options={{
          title: 'Zones',
          tabBarIcon: ({ color: c }) => (
            <LayoutGrid size={ICON_SIZE} color={c} strokeWidth={ICON_STROKE} />
          ),
        }}
      />
      <Tabs.Screen
        name="schedules"
        options={{
          title: 'Times',
          tabBarIcon: ({ color: c }) => (
            <CalendarClock size={ICON_SIZE} color={c} strokeWidth={ICON_STROKE} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarIcon: ({ color: c }) => (
            <User size={ICON_SIZE} color={c} strokeWidth={ICON_STROKE} />
          ),
        }}
      />
    </Tabs>
  );
}
