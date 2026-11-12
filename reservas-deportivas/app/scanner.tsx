import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, FlatList, Linking, StyleSheet, View } from 'react-native';
import { Button, PressableSurface, Screen, StateView, Text, TextField, uiLayout } from '../src/components/ui';
import { layout, radius, spacing, useTheme } from '../src/theme';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { autenticarPersonal } from '../src/services/biometria';
import { obtenerEspacios } from '../src/services/espacios';
import { operacionesService } from '../src/services/operaciones';
import { authService } from '../src/services/auth';
import type { Espacio } from '../src/tipos';

export default function EscanerScreen() {
  const { colors } = useTheme();
  const { usuario, cargando: cargandoSesion } = useAuth();
  const autorizado = usuario?.rol === 'encargado' || usuario?.rol === 'administrador';
  const [permission, requestPermission, getPermission] = useCameraPermissions();
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [espacio, setEspacio] = useState<Espacio | null>(null);
  const [cargando, setCargando] = useState(false);
  const [autenticado, setAutenticado] = useState(false);
  const [enFoco, setEnFoco] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<string | null>(null);
  const [usarContrasena, setUsarContrasena] = useState(false);
  const [contrasena, setContrasena] = useState('');
  const [linterna, setLinterna] = useState(false);
  // El ref evita dos peticiones antes de que React aplique el siguiente render.
  const ocupado = useRef(false);
  const generacion = useRef(0);

  useFocusEffect(useCallback(() => {
    setEnFoco(true);
    return () => {
      generacion.current += 1;
      setEnFoco(false);
      setAutenticado(false);
    };
  }, []));

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (estado) => {
      if (estado === 'background') {
        generacion.current += 1;
        setAutenticado(false);
      }
      if (estado === 'active') {
        void getPermission().catch(() => setError('No se pudo consultar el permiso de cámara.'));
      }
    });
    return () => subscription.remove();
  }, [getPermission]);

  useEffect(() => {
    generacion.current += 1;
    setAutenticado(false);
  }, [usuario?.id, usuario?.rol]);

  const cargarEspacios = async () => {
    setCargando(true);
    setError(null);
    try {
      const { datos } = await obtenerEspacios();
      setEspacios(datos.filter((item) => item.activo));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar las canchas.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (autorizado) void cargarEspacios();
  }, [autorizado]);

  const habilitarEscaner = async () => {
    if (!autorizado || !espacio || ocupado.current) return;
    ocupado.current = true;
    setProcesando(true);
    setError(null);
    setResultado(null);
    const actual = generacion.current;
    try {
      const valido = usarContrasena && usuario ? await authService.verificarPersonal(usuario.email, contrasena, usuario.id) : await autenticarPersonal();
      if (actual === generacion.current) {
        setAutenticado(valido);
        if (!valido) setError('Identidad no confirmada. Podés volver a intentar.');
        if (valido) setContrasena('');
      }
    } catch (err: unknown) {
      if (actual === generacion.current) setError(err instanceof Error ? err.message : 'No se pudo verificar tu identidad.');
    } finally {
      ocupado.current = false;
      setProcesando(false);
    }
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (ocupado.current || !autorizado || !autenticado || !espacio || !enFoco) return;
    ocupado.current = true;
    setProcesando(true);
    setError(null);
    const actual = generacion.current;
    try {
      const reserva = await operacionesService.registrarIngreso(data, espacio.id);
      if (actual !== generacion.current) return;
      setResultado(`Ingreso registrado en ${espacio.nombre}. Estado: ${reserva.estado}. Hora: ${reserva.ingresoEn ?? 'no informada'}.`);
      // La háptica es auxiliar: su fallo no transforma un ingreso válido en error.
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    } catch (err: unknown) {
      if (actual !== generacion.current) return;
      setError(err instanceof Error ? err.message : 'No se pudo registrar el ingreso.');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined);
    } finally {
      if (actual === generacion.current) setAutenticado(false);
      ocupado.current = false;
      setProcesando(false);
    }
  };

  if (cargandoSesion) return <Screen><StateView><ActivityIndicator color={colors.primary} accessibilityLabel="Cargando sesión" /></StateView></Screen>;
  if (!autorizado) {
    return <Screen><StateView><Text tone="muted">Acceso restringido a encargados y administradores.</Text></StateView></Screen>;
  }

  return (
    <Screen>
      <View style={styles.panel}>
        <Text variant="title" accessibilityRole="header">Registrar ingreso</Text>
        <Text tone="muted">Elegí la cancha donde estás controlando el ingreso, no la indicada por el QR.</Text>
        {espacio && <Text variant="subtitle">{espacio.nombre}</Text>}
        {error && <Text selectable accessibilityRole="alert" tone="danger">{error}</Text>}
        {resultado && <Text selectable accessibilityLiveRegion="polite" tone="success">{resultado}</Text>}
      </View>
      {!espacio ? (
        cargando ? <ActivityIndicator color={colors.primary} accessibilityLabel="Cargando canchas" /> : (
          <FlatList
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={uiLayout.listContent}
            data={espacios}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={<StateView><Text tone="muted">No hay canchas disponibles.</Text></StateView>}
            ListHeaderComponent={<Button variant="secondary" title="Recargar canchas" onPress={cargarEspacios} />}
            renderItem={({ item }) => (
              <PressableSurface accessibilityRole="button" onPress={() => { setEspacio(item); setError(null); }}>
                <Text variant="subtitle">{item.nombre}</Text>
                <Text tone="muted">{item.complejo}</Text>
              </PressableSurface>
            )}
          />
        )
      ) : (
        <>
          {!autenticado ? (
            <View style={styles.panel}>
              {usarContrasena && <TextField label="Contraseña de tu cuenta" value={contrasena} onChangeText={setContrasena} secureTextEntry autoComplete="current-password" editable={!procesando} />}
              <Button title={procesando ? 'Procesando…' : 'Confirmar identidad y escanear'} disabled={procesando || (usarContrasena && !contrasena)} onPress={habilitarEscaner} />
              <Button variant="ghost" title={usarContrasena ? 'Usar huella o rostro' : 'Usar contraseña'} disabled={procesando}
                onPress={() => { setUsarContrasena(v => !v); setContrasena(''); setError(null); }} />
            </View>
          ) : !permission ? <ActivityIndicator color={colors.primary} accessibilityLabel="Consultando permiso de cámara" /> : !permission.granted ? (
            <View style={styles.panel}>
              <Text>Necesitamos la cámara para leer el QR de la reserva.</Text>
              <Button title={permission.canAskAgain ? 'Permitir cámara' : 'Abrir ajustes'} onPress={() => {
                const accion = permission.canAskAgain ? requestPermission() : Linking.openSettings();
                void accion.catch(() => setError('No se pudo abrir el permiso de cámara. Revisá los ajustes del dispositivo.'));
              }} />
            </View>
          ) : enFoco && !procesando && (
            <CameraView
              style={styles.camera}
              facing="back"
              enableTorch={linterna}
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={handleBarCodeScanned}
              onMountError={() => { setAutenticado(false); setError('No se pudo iniciar la cámara. Revisá los permisos y volvé a intentar.'); }}
            />
          )}
          {autenticado && <Button variant="secondary" title={linterna ? 'Apagar linterna' : 'Encender linterna'} onPress={() => setLinterna(v => !v)} />}
          {procesando && <ActivityIndicator color={colors.primary} accessibilityLabel="Procesando ingreso" />}
          <Button variant="ghost" style={styles.action} title="Cambiar cancha" disabled={procesando} onPress={() => {
            setAutenticado(false);
            setEspacio(null);
            setError(null);
            setResultado(null);
            setContrasena(''); setLinterna(false);
          }} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  panel: { padding: spacing.xl, gap: spacing.md },
  action: { marginHorizontal: spacing.xl, marginBottom: spacing.sm },
  camera: { flex: 1, minHeight: layout.cameraMinHeight, margin: spacing.xl, borderRadius: radius.card, overflow: 'hidden' },
});
