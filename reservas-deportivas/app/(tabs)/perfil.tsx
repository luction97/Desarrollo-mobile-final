import { ScrollView, View, StyleSheet } from 'react-native';
import { Badge, Button, Screen, Text, uiLayout } from '../../src/components/ui';
import { borders, radius, spacing, useTheme } from '../../src/theme';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { permisosDe } from '../../src/utils/permisos';
import { etiquetasRol } from '../../src/utils/etiquetas';

export default function PerfilScreen() {
  const router = useRouter();
  const { usuario, usuarioGuardado, tieneBiometria, sesionVencida, bloquear, logout, cargando } = useAuth();

  const { puedeReservar } = permisosDe(usuario);
  const { colors } = useTheme();

  return (
    <Screen topInset>
      <ScrollView contentContainerStyle={styles.container}>
        <Text variant="display" accessibilityRole="header">Cuenta</Text>
        {!usuario ? (
          <View style={styles.seccion}>
            <Text variant="subtitle">{usuarioGuardado ? 'Sesión bloqueada' : 'Invitado'}</Text>
            <Text tone="muted">
              {usuarioGuardado
                ? 'Tu sesión sigueguardada en el teléfono. Desbloqueá con tu huella o tu contraseña para volver a usarla.'
                : 'Iniciá sesión para ver tus reservas y gestionar tu cuenta.'}
            </Text>
            {usuarioGuardado && tieneBiometria && <Button variant="secondary" title="Usar huella o rostro"
              onPress={() => router.push('/login')} />}
            <Button title="Iniciar sesión" onPress={() => router.push('/login')} />
            {!usuarioGuardado && <Button variant="ghost" title="Crear cuenta" onPress={() => router.push('/registro')} />}
          </View>
        ) : (
          <>
            <View style={[styles.identidad, { borderColor: colors.border }]}>
              <View style={[styles.avatar, { backgroundColor: colors.primaryContainer }]}>
                <Text variant="subtitle" tone="primary" accessible={false}>{usuario.nombre.trim().charAt(0).toUpperCase()}</Text>
              </View>
              <View style={[uiLayout.grow, styles.seccion]}>
                <Text variant="title">{usuario.nombre}</Text>
                <Text variant="label" tone="muted">{usuario.email}</Text>
                <Badge size="sm">{etiquetasRol[usuario.rol]}</Badge>
              </View>
            </View>
            {sesionVencida && <View style={styles.seccion}>
              <Text variant="subtitle" tone="warning">Tu sesión venció</Text>
              <Text tone="muted">Podés seguir mirando la app, pero para reservar o gestionar tenés que volver a entrar.</Text>
              <Button variant="secondary" title="Ingresar de nuevo" onPress={() => router.push('/login')} />
            </View>}
            {puedeReservar && <View style={styles.seccion}>
              <Text variant="subtitle" accessibilityRole="header">Tu historial</Text>
              <View style={[uiLayout.fila, { borderColor: colors.border }]}>
                <Text variant="label" style={uiLayout.grow}>Cancelaciones fuera de plazo</Text>
                <Text variant="action" numeric>{usuario.cancelacionesTardias}</Text>
              </View>
              <View style={[uiLayout.fila, { borderColor: colors.border }]}>
                <Text variant="label" style={uiLayout.grow}>Ausencias</Text>
                <Text variant="action" numeric>{usuario.ausencias}</Text>
              </View>
            </View>}
            {tieneBiometria && <Button variant="ghost" title="Bloquear con huella o rostro"
              accessibilityLabel="Bloquear la app con biometría" onPress={bloquear} />}
            <Button variant="secondary" title="Cerrar sesión" onPress={() => void logout()} loading={cargando} />
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.xl, gap: spacing.lg },
  seccion: { gap: spacing.xs },
  identidad: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingBottom: spacing.lg, borderBottomWidth: borders.thin },
  avatar: { minWidth: spacing.huge, minHeight: spacing.huge, padding: spacing.sm, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full },
});
