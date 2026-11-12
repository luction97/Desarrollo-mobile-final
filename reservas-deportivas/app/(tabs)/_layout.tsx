import Ionicons from '@react-native-vector-icons/ionicons';
import { Tabs } from 'expo-router';
import { layout, spacing, typography, useTheme } from '../../src/theme';
import { useAuth } from '../../src/context/AuthContext';
import { permisosDe } from '../../src/utils/permisos';

export default function TabLayout() {
  const { colors } = useTheme();
  const { usuario } = useAuth();
  // El personal gestiona sus turnos desde la agenda; "Mis Reservas" es del jugador.
  const verReservas = !usuario || permisosDe(usuario).puedeReservar;
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
          title: 'Canchas',
          tabBarIcon: ({ color }) => <Ionicons size={spacing.xxl} name="football-outline" color={color} />,
        }}
      />

      <Tabs.Screen
        name="two"
        options={{
          href: verReservas ? undefined : null,
          title: 'Mis reservas',
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
