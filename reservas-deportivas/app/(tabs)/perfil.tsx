import { View, StyleSheet } from 'react-native';
import { Button, Screen, Surface, Text, uiLayout } from '../../src/components/ui';
import { radius, spacing } from '../../src/theme';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { permisosDe } from '../../src/utils/permisos';
import { etiquetasRol } from '../../src/utils/etiquetas';

export default function PerfilScreen() {
  const router = useRouter();
  const { usuario, logout, cargando } = useAuth();

  const { puedeGestionar, puedeReservar } = permisosDe(usuario);

  return (
    <Screen topInset>
      <View style={styles.container}>
        <Text variant="title" accessibilityRole="header">Perfil</Text>
        {!usuario ? (
          <Surface style={styles.card}>
            <Text variant="subtitle">Invitado</Text>
            <Text tone="muted">Iniciá sesión para ver tus reservas y gestionar tu cuenta.</Text>
            <Button title="Iniciar sesión" onPress={() => router.push('/login')} />
            <Button variant="ghost" title="Crear cuenta" onPress={() => router.push('/registro')} />
          </Surface>
        ) : (
          <>
            <Surface style={styles.card}>
              <Text variant="subtitle">{usuario.nombre}</Text>
              <Text tone="muted">{usuario.email}</Text>
              <Text variant="label" tone="muted">{etiquetasRol[usuario.rol]}</Text>
              <Button variant="ghost" title="Cerrar sesión" onPress={() => void logout()} loading={cargando} />
            </Surface>
            {puedeReservar && <Surface style={styles.card}>
              <Text variant="subtitle">Tu historial</Text>
              <View style={uiLayout.row}>
                <View style={uiLayout.grow}>
                  <Text variant="label" tone="muted">Cancelaciones fuera de plazo</Text>
                  <Text variant="title" numeric>{usuario.cancelacionesTardias}</Text>
                </View>
                <View style={uiLayout.grow}>
                  <Text variant="label" tone="muted">Ausencias</Text>
                  <Text variant="title" numeric>{usuario.ausencias}</Text>
                </View>
              </View>
            </Surface>}
            {puedeGestionar && (
              <Surface style={styles.card}>
                <Text variant="subtitle">Gestión</Text>
                <Button variant="secondary" title="Agenda del día" onPress={() => router.push('/agenda')} />
                <Button variant="secondary" title="Escanear QR" onPress={() => router.push('/scanner')} />
                <Button variant="secondary" title="Gestionar canchas" onPress={() => router.push('/admin')} />
              </Surface>
            )}
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.xl, gap: spacing.lg },
  card: { padding: spacing.lg, gap: spacing.sm, borderRadius: radius.card },
});
