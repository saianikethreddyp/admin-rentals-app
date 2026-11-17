import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { colors } from '@/theme';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const tab = (title: string, icon: IconName, focusedIcon: IconName) => ({
  title,
  tabBarIcon: ({ color, focused, size }: { color: ColorValue; focused: boolean; size: number }) => (
    <MaterialCommunityIcons name={focused ? focusedIcon : icon} size={size} color={color as string} />
  ),
});

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.primary },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: '600' },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarStyle: { borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen name="index" options={tab('Home', 'view-dashboard-outline', 'view-dashboard')} />
      <Tabs.Screen name="bookings" options={tab('Bookings', 'calendar-clock-outline', 'calendar-clock')} />
      <Tabs.Screen name="cars" options={tab('Cars', 'car-outline', 'car')} />
      <Tabs.Screen name="more" options={tab('More', 'dots-horizontal-circle-outline', 'dots-horizontal-circle')} />
    </Tabs>
  );
}
