import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { AuthProvider } from '../src/context/AuthContext';
import { AperturaNotificacion } from '../src/components/AperturaNotificacion';
import { useTheme } from '../src/theme';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Ionicons: require('@react-native-vector-icons/ionicons/fonts/Ionicons.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { colors } = useTheme();

  return (
    <AuthProvider>
      <ThemeProvider value={{
        ...(colorScheme === 'dark' ? DarkTheme : DefaultTheme),
        colors: {
          ...(colorScheme === 'dark' ? DarkTheme : DefaultTheme).colors,
          primary: colors.primary, background: colors.background, card: colors.surface,
          text: colors.text, border: colors.border, notification: colors.danger,
        },
      }}>
        <Stack screenOptions={{ headerTintColor: colors.text, headerStyle: { backgroundColor: colors.background }, headerShadowVisible: false, contentStyle: { backgroundColor: colors.background } }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ headerShown: false }} />
          <Stack.Screen name="registro" options={{ title: 'Crear cuenta' }} />
          <Stack.Screen 
            name="scanner" 
            options={{ title: 'Escanear QR' }}
          />
          <Stack.Screen name="espacio/[id]" options={{ title: 'La cancha' }} />
          
          <Stack.Screen name="admin" options={{ title: 'Gestión del complejo' }} />
          <Stack.Screen name="mapa" options={{ title: 'Mapa de complejos' }} />
        </Stack>
        <AperturaNotificacion />
      </ThemeProvider>
    </AuthProvider>
  );
}
