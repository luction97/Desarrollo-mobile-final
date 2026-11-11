import Ionicons from '@react-native-vector-icons/ionicons';
import { Tabs } from 'expo-router';
import { layout, spacing, typography, useTheme } from '../../src/theme';

export default function TabLayout() {
  const { colors } = useTheme();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, minHeight: layout.tabBarMinHeight },
        tabBarLabelStyle: { ...typography.caption, flexShrink: 0 },
        headerShown: false,
      }}>
      
      <Tabs.Screen
        name="index"
        options={{
          title: 'Espacios',
          tabBarIcon: ({ color }) => <Ionicons size={spacing.xxl} name="football-outline" color={color} />,
        }}
      />

      <Tabs.Screen
        name="two"
        options={{
          title: 'Mis Reservas',
          tabBarIcon: ({ color }) => <Ionicons size={spacing.xxl} name="ticket-outline" color={color} />,
        }}
      />

      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <Ionicons size={spacing.xxl} name="person-outline" color={color} />,
        }}
      />
    </Tabs>
  );
}
