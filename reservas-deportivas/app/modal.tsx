import { StatusBar } from 'expo-status-bar';

import { ScrollScreen, Surface, Text, uiLayout } from '../src/components/ui';

export default function ModalScreen() {
  return (
    <ScrollScreen>
      <Text variant="title" accessibilityRole="header">Acerca de Reservas Deportivas</Text>
      <Surface style={uiLayout.section}>
        <Text>Consultá disponibilidad, reservá turnos y llevá tu código QR aunque no tengas señal.</Text>
        <Text tone="muted">El pago se realiza en el complejo. La app no cobra ni solicita datos de tarjetas.</Text>
      </Surface>
      <Text variant="label" tone="muted">Versión 1.0.0</Text>
      <StatusBar style="auto" />
    </ScrollScreen>
  );
}
