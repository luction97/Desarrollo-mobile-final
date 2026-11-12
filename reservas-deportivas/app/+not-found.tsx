import { Stack, useRouter } from 'expo-router';
import { Button, Screen, StateView, Text } from '../src/components/ui';

export default function NotFoundScreen() {
  const router = useRouter();
  return (
    <>
      <Stack.Screen options={{ title: 'Pantalla no encontrada' }} />
      <Screen><StateView>
        <Text variant="title" accessibilityRole="header">No encontramos esta pantalla</Text>
        <Text tone="muted">Volvé al inicio para ver las canchas y sus horarios.</Text>
        <Button title="Volver al inicio" onPress={() => router.replace('/')} />
      </StateView></Screen>
    </>
  );
}
