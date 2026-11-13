import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Chip, ScrollScreen, Screen, StateView, Text, uiLayout } from '../src/components/ui';
import { DialogoAviso } from '../src/components/DialogoAviso';
import { BloqueosPanel } from '../src/components/admin/BloqueosPanel';
import { FijasPanel } from '../src/components/admin/FijasPanel';
import { PanelTarifa } from '../src/components/admin/PanelTarifa';
import { useAuth } from '../src/context/AuthContext';
import { obtenerEspacios } from '../src/services/espacios';
import { permisosDe } from '../src/utils/permisos';
import { spacing, useTheme } from '../src/theme';
import type { Espacio } from '../src/tipos';

type Seccion = 'bloqueos' | 'fijas' | 'tarifa';

const SECCIONES: { id: Seccion; nombre: string }[] = [
  { id: 'bloqueos', nombre: 'Bloqueos' },
  { id: 'fijas', nombre: 'Reservas fijas' },
  { id: 'tarifa', nombre: 'Tarifa' },
];

export default function AdminScreen() {
  const { usuario } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const { puedeGestionar: autorizado } = permisosDe(usuario);
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [seccion, setSeccion] = useState<Seccion>('bloqueos');
  const [cargandoEspacios, setCargandoEspacios] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargandoEspacios(true);
    try {
      const { datos } = await obtenerEspacios();
      setEspacios(datos);
    } catch (e) {
      setMensaje(e instanceof Error ? e.message : 'No se pudieron cargar las canchas.');
    } finally {
      setCargandoEspacios(false);
    }
  }, []);

  useEffect(() => { if (autorizado) void cargar(); }, [autorizado, cargar]);

  if (!autorizado) return <Screen><StateView>
    <Text>Esta sección es para el personal del complejo.</Text>
    <Button title={usuario ? 'Volver a las canchas' : 'Iniciar sesión'} onPress={() => router.push(usuario ? '/(tabs)' : '/login')} />
  </StateView></Screen>;

  return <KeyboardAvoidingView style={uiLayout.grow} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollScreen contentContainerStyle={{ gap: spacing.lg }}>
      <View style={uiLayout.row}>
        <Text variant="title" style={uiLayout.grow}>Gestión del complejo</Text>
      </View>
      <View style={styles.secciones}>
        {SECCIONES.map(s => <Chip key={s.id} accessibilityLabel={s.nombre} selected={s.id === seccion}
          onPress={() => setSeccion(s.id)}>{s.nombre}</Chip>)}
      </View>
      {cargandoEspacios && <ActivityIndicator color={colors.primary} />}
      {!cargandoEspacios && !espacios.length && <Button title="Reintentar carga" onPress={cargar} />}

      {espacios.length > 0 && <>
        {seccion === 'bloqueos' && <BloqueosPanel espacios={espacios} />}
        {seccion === 'fijas' && <FijasPanel key={`${usuario?.id}:${espacios.length}`} espacios={espacios} editable={autorizado} />}
        {seccion === 'tarifa' && <PanelTarifa espacios={espacios} puedeCambiar={autorizado} />}
      </>}

      {mensaje && <DialogoAviso titulo="Administración" mensaje={mensaje} accionPrincipal="Entendido" onConfirmar={() => setMensaje(null)} onCerrar={() => setMensaje(null)} />}
    </ScrollScreen>
  </KeyboardAvoidingView>;
}

const styles = StyleSheet.create({
  secciones: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
