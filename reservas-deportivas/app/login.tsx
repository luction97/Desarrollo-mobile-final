import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Text, TextField } from '../src/components/ui';
import { layout, spacing, useTheme } from '../src/theme';
import { useAuth } from '../src/context/AuthContext';

export default function LoginScreen() {
  const { colors } = useTheme();
  const { login, desbloquear, usuarioGuardado, tieneBiometria, cargando: restaurando } = useAuth();
  const params = useLocalSearchParams<{ volverA?: string; espacioId?: string; fecha?: string }>();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const continuar = () => {
    if (params.volverA === 'reservas') router.replace('/(tabs)/two');
    else router.replace({ pathname: '/(tabs)', params: { espacioId: params.espacioId, fecha: params.fecha } });
  };

  const ingresar = async () => {
    if (cargando) return;
    setError('');
    if (!email.trim() || !contrasena) { setError('Completá todos los campos'); return; }
    setCargando(true);
    try { await login(email, contrasena); continuar(); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo iniciar sesión.'); }
    finally { setCargando(false); }
  };

  const usarBiometria = async () => {
    if (cargando) return;
    setError(''); setCargando(true);
    try { if (await desbloquear()) continuar(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Usá tu contraseña para ingresar.'); }
    finally { setCargando(false); }
  };

  return <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        <View style={styles.form}>
          <Text variant="display" accessibilityRole="header">Deporturnos</Text>
          <Text tone="muted">Reservas Deportivas Villaguay</Text>
          <Text variant="title" accessibilityRole="header">Iniciar sesión</Text>
          {error !== '' && <Text selectable accessibilityRole="alert" tone="danger">{error}</Text>}
          {usuarioGuardado && tieneBiometria && <View style={styles.fields}>
            <Text variant="subtitle">¡Hola de nuevo, {usuarioGuardado.nombre.split(' ')[0]}!</Text>
            <Button variant="secondary" title="Usar huella o rostro" onPress={usarBiometria} disabled={cargando || restaurando} />
          </View>}
          <View style={styles.fields}>
            <TextField label="Email" placeholder="Email" value={email} onChangeText={setEmail}
              autoCapitalize="none" keyboardType="email-address" autoComplete="email" editable={!cargando} />
            <TextField label="Contraseña" placeholder="Contraseña" value={contrasena} onChangeText={setContrasena}
              secureTextEntry autoComplete="current-password" editable={!cargando} onSubmitEditing={ingresar} />
            <Button title={cargando ? 'Ingresando...' : 'Ingresar'} onPress={ingresar} disabled={cargando || restaurando} />
          </View>
          <Button variant="ghost" title="Crear cuenta" disabled={cargando}
            onPress={() => router.push({ pathname: '/registro', params: { volverA: params.volverA, espacioId: params.espacioId, fecha: params.fecha } })} />
          <Button variant="ghost" title="Seguir explorando" onPress={() => router.replace('/(tabs)')} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl, paddingVertical: spacing.xxxl },
  form: { width: '100%', maxWidth: layout.formWidth, alignSelf: 'center', gap: spacing.xxl },
  fields: { gap: spacing.lg },
});
