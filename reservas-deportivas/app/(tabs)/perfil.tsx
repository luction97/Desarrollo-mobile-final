import { useState } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Badge, Button, Screen, Text, uiLayout } from '../../src/components/ui';
import { DialogoAviso } from '../../src/components/DialogoAviso';
import { borders, radius, spacing, useTheme } from '../../src/theme';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { permisosDe } from '../../src/utils/permisos';
import { etiquetasRol } from '../../src/utils/etiquetas';

export default function PerfilScreen() {
  const router = useRouter();
  const { usuario, logout, cargando, tieneBiometria, accesoBiometrico, activarAcceso, desactivarAcceso } = useAuth();
  const [aviso, setAviso] = useState<string | null>(null);
  const [operando, setOperando] = useState(false);

  const { puedeReservar } = permisosDe(usuario);
  const { colors } = useTheme();

  const alternarAcceso = async () => {
    if (!usuario || operando) return;
    setOperando(true);
    try {
      if (accesoBiometrico) {
        await desactivarAcceso();
        setAviso('El acceso con huella o rostro quedó desactivado en este teléfono.');
      } else {
        if (!tieneBiometria) { setAviso('Este teléfono no tiene huella o rostro configurado.'); return; }
        const ok = await activarAcceso();
        if (!ok) { setAviso('No pudimos activar el acceso biométrico.'); return; }
        setAviso('Listo. La próxima vez entrás con tu huella o tu rostro.');
      }
    } finally {
      setOperando(false);
    }
  };

  return (
    <Screen topInset>
      <ScrollView contentContainerStyle={styles.container}>
        <Text variant="display" accessibilityRole="header">Cuenta</Text>
        {!usuario ? (
          <View style={styles.seccion}>
            <Text variant="subtitle">Invitado</Text>
            <Text tone="muted">Iniciá sesión para ver tus reservas y gestionar tu cuenta.</Text>
            <Button title="Iniciar sesión" onPress={() => router.push('/login')} />
            <Button variant="ghost" title="Crear cuenta" onPress={() => router.push('/registro')} />
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
            <View style={styles.seccion}>
              <Text variant="subtitle" accessibilityRole="header">Acceso biométrico</Text>
              <Text variant="label" tone="muted">
                {accesoBiometrico
                  ? 'Entrás con tu huella o tu rostro. La sesión sigue guardada en este teléfono.'
                  : tieneBiometria
                    ? 'Activá el ingreso con huella o rostro para entrar más rápido la próxima vez.'
                    : 'Este teléfono no tiene huella o rostro configurado.'}
              </Text>
              {tieneBiometria && <Button
                variant={accesoBiometrico ? 'secondary' : 'primary'}
                title={accesoBiometrico ? 'Desactivar acceso biométrico' : 'Activar acceso biométrico'}
                loading={operando} disabled={operando} onPress={() => void alternarAcceso()} />}
            </View>
            <Button variant="secondary" title="Cerrar sesión" onPress={() => void logout()} loading={cargando} />
          </>
        )}
      </ScrollView>
      {aviso && <DialogoAviso titulo="Acceso biométrico" mensaje={aviso} accionPrincipal="Entendido"
        onConfirmar={() => setAviso(null)} onCerrar={() => setAviso(null)} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.xl, gap: spacing.lg },
  seccion: { gap: spacing.xs },
  identidad: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingBottom: spacing.lg, borderBottomWidth: borders.thin },
  avatar: { minWidth: spacing.huge, minHeight: spacing.huge, padding: spacing.sm, alignItems: 'center', justifyContent: 'center', borderRadius: radius.full },
});
