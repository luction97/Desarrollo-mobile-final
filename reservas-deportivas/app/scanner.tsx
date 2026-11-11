import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Button, FlatList, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../src/context/AuthContext';
import { autenticarPersonal } from '../src/services/biometria';
import { operacionesService } from '../src/services/operaciones';
import type { Espacio } from '../src/tipos';

export default function EscanerScreen() {
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
      const datos = await operacionesService.obtenerEspacios();
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
      const valido = await autenticarPersonal();
      if (actual === generacion.current) {
        setAutenticado(valido);
        if (!valido) setError('Identidad no confirmada. Podés volver a intentar.');
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

  if (cargandoSesion) return <ActivityIndicator accessibilityLabel="Cargando sesión" />;
  if (!autorizado) {
    return <View style={styles.panel}><Text>Acceso restringido a encargados y administradores.</Text></View>;
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <View style={styles.panel}>
        <Text style={styles.title}>Registrar ingreso</Text>
        <Text>Elegí la cancha donde estás controlando el ingreso, no la indicada por el QR.</Text>
        {espacio && <Text style={styles.title}>{espacio.nombre}</Text>}
        {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
        {resultado && <Text accessibilityLiveRegion="polite">{resultado}</Text>}
      </View>
      {!espacio ? (
        cargando ? <ActivityIndicator accessibilityLabel="Cargando canchas" /> : (
          <FlatList
            data={espacios}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={<Text style={styles.panel}>No hay canchas disponibles.</Text>}
            ListHeaderComponent={<Button title="Recargar canchas" onPress={cargarEspacios} />}
            renderItem={({ item }) => (
              <TouchableOpacity accessibilityRole="button" style={styles.option} onPress={() => { setEspacio(item); setError(null); }}>
                <Text style={styles.title}>{item.nombre}</Text>
                <Text>{item.complejo}</Text>
              </TouchableOpacity>
            )}
          />
        )
      ) : (
        <>
          {!autenticado ? (
            <Button title={procesando ? 'Procesando…' : 'Confirmar identidad y escanear'} disabled={procesando} onPress={habilitarEscaner} />
          ) : !permission ? <ActivityIndicator accessibilityLabel="Consultando permiso de cámara" /> : !permission.granted ? (
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
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={handleBarCodeScanned}
              onMountError={() => { setAutenticado(false); setError('No se pudo iniciar la cámara. Revisá los permisos y volvé a intentar.'); }}
            />
          )}
          {procesando && <ActivityIndicator accessibilityLabel="Procesando ingreso" />}
          <Button title="Cambiar cancha" disabled={procesando} onPress={() => {
            setAutenticado(false);
            setEspacio(null);
            setError(null);
            setResultado(null);
          }} />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  panel: { padding: 16, gap: 12 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#222' },
  option: { minHeight: 48, padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#ccc' },
  error: { color: '#B71C1C' },
  camera: { flex: 1, minHeight: 160 },
});
