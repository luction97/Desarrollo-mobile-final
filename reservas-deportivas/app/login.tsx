import { useEffect, useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, Text, TextField } from '../src/components/ui';
import { layout, radius, spacing, useTheme } from '../src/theme';
import { useAuth } from '../src/context/AuthContext';

const LOGO = require('../assets/branding/icon_app-reservas_deportivas_1024.png');

export default function LoginScreen() {
  const { colors } = useTheme();
  const { login, desbloquear, usuarioGuardado, tieneBiometria, pideReingreso, cargando: restaurando } = useAuth();
  const params = useLocalSearchParams<{ volverA?: string; espacioId?: string; fecha?: string; turnoId?: string; personas?: string }>();
  const router = useRouter();
  const [conContraseña, setConContraseña] = useState(false);
  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  // Con una sesión guardada y biometría activa, la pantalla pide el reingreso.
  useEffect(() => { if (pideReingreso) setConContraseña(false); }, [pideReingreso]);
  // "Usar contraseña" deja el correo del último usuario precargado.
  useEffect(() => {
    if (usuarioGuardado?.email && !email) setEmail(usuarioGuardado.email);
  }, [usuarioGuardado?.email]);

  const continuar = () => {
    if (params.volverA === 'reservas') router.replace('/(tabs)/two');
    else router.replace({ pathname: '/(tabs)', params: { espacioId: params.espacioId, fecha: params.fecha, turnoId: params.turnoId, personas: params.personas } });
  };

  const ingresar = async () => {
    if (cargando) return;
    setError('');
    if (!email.trim() || !contrasena) { setError('Completá todos los campos.'); return; }
    setCargando(true);
    try { await login(email.trim(), contrasena); continuar(); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo iniciar sesión.'); }
    finally { setCargando(false); }
  };

  const usarBiometria = async () => {
    if (cargando) return;
    setError(''); setCargando(true);
    try { if (await desbloquear()) continuar(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Ingresá con tu contraseña.'); }
    finally { setCargando(false); }
  };

  const reingreso = pideReingreso && tieneBiometria && !conContraseña;

  return <SafeAreaView style={[styles.contenedor, { backgroundColor: colors.background }]}>
    <KeyboardAvoidingView style={styles.contenedor} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={styles.scroll}>
        <View style={styles.formulario}>
          <Image source={LOGO} style={styles.logo} resizeMode="contain" accessibilityLabel="Deporturnos" />
          <View style={styles.marca}>
            <Text variant="display" accessibilityRole="header">Deporturnos</Text>
            <Text variant="label" tone="muted">Reservas Deportivas Villaguay</Text>
          </View>

          {reingreso ? <>
            <View style={styles.bloque}>
              <Text variant="title" accessibilityRole="header">¡Bienvenido de nuevo!</Text>
              <Text tone="muted">{usuarioGuardado?.nombre}. Usá tu huella o tu rostro para entrar.</Text>
            </View>
            {error !== '' && <Text selectable accessibilityRole="alert" tone="danger">{error}</Text>}
            <Button title="Ingresar con huella o rostro" onPress={usarBiometria} loading={cargando} disabled={cargando || restaurando} />
            <Button variant="ghost" title="Usar contraseña" onPress={() => { setError(''); setConContraseña(true); }} disabled={cargando} />
          </> : <>
            <View style={styles.bloque}>
              <Text variant="title" accessibilityRole="header">Iniciar sesión</Text>
              <Text tone="muted">Entrá para reservar turnos y ver tus reservas.</Text>
            </View>
            {error !== '' && <Text selectable accessibilityRole="alert" tone="danger">{error}</Text>}
            <View style={styles.campos}>
              <TextField label="Correo" placeholder="correo@ejemplo.com" value={email} onChangeText={setEmail}
                autoCapitalize="none" keyboardType="email-address" autoComplete="email" editable={!cargando} />
              <TextField label="Contraseña" placeholder="Tu contraseña" value={contrasena} onChangeText={setContrasena}
                secureTextEntry autoComplete="current-password" editable={!cargando} onSubmitEditing={ingresar} />
            </View>
            <Button title="Ingresar" onPress={ingresar} loading={cargando} disabled={cargando || restaurando} />
            <Button variant="ghost" title="Crear cuenta" disabled={cargando}
              onPress={() => router.push({ pathname: '/registro', params: { volverA: params.volverA, espacioId: params.espacioId, fecha: params.fecha, turnoId: params.turnoId, personas: params.personas } })} />
          </>}

          {!reingreso && <Button variant="ghost" title="Seguir explorando" disabled={cargando}
            onPress={() => router.replace('/(tabs)')} />}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  contenedor: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl, paddingVertical: spacing.xxxl },
  formulario: { width: '100%', maxWidth: layout.formWidth, alignSelf: 'center', gap: spacing.lg },
  logo: { width: 72, height: 72, borderRadius: radius.card, alignSelf: 'center' },
  marca: { alignItems: 'center', gap: spacing.xs },
  bloque: { gap: spacing.xs },
  campos: { gap: spacing.lg },
});
