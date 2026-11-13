import { useEffect, useCallback, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Chip, ScrollScreen, Screen, StateView, Surface, Text, TextField, uiLayout } from '../src/components/ui';
import { DialogoAviso } from '../src/components/DialogoAviso';
import { BloqueosPanel } from '../src/components/admin/BloqueosPanel';
import { FijasPanel } from '../src/components/admin/FijasPanel';
import { useAuth } from '../src/context/AuthContext';
import { operacionesService } from '../src/services/operaciones';
import { guardarEspacioActualizado, obtenerEspacios } from '../src/services/espacios';
import { ApiError } from '../src/services/api';
import { precioLegible } from '../src/utils/dinero';
import { permisosDe } from '../src/utils/permisos';
import { spacing, useTheme } from '../src/theme';
import type { Espacio } from '../src/tipos';

export default function AdminScreen() {
  const { usuario } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const { puedeGestionar: autorizado, puedeAdministrar: esAdmin } = permisosDe(usuario);
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [espacioId, setEspacioId] = useState('');
  const [cargandoEspacios, setCargandoEspacios] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [precio, setPrecio] = useState('');
  const [cambiandoPrecio, setCambiandoPrecio] = useState(false);
  const espacio = espacios.find(e => e.id === espacioId);

  const cargar = useCallback(async () => {
    setCargandoEspacios(true);
    try {
      const { datos } = await obtenerEspacios();
      setEspacios(datos);
      setEspacioId(actual => actual || datos[0]?.id || '');
    } catch (e) {
      setMensaje(e instanceof Error ? e.message : 'No se pudieron cargar las canchas.');
    } finally {
      setCargandoEspacios(false);
    }
  }, []);
  useEffect(() => { if (autorizado) void cargar(); }, [autorizado, cargar]);

  const cambiarPrecio = async () => {
    if (!espacio || cambiandoPrecio || !autorizado) return;
    if (!precio.trim() || !Number.isInteger(Number(precio)) || Number(precio) <= 0) {
      setMensaje('Ingresá un precio entero, mayor que cero.'); return;
    }
    setCambiandoPrecio(true);
    try {
      const actualizado = await operacionesService.cambiarPrecio(espacio.id, Number(precio));
      setEspacios(datos => datos.map(e => e.id === actualizado.id ? actualizado : e));
      await guardarEspacioActualizado(actualizado).catch(() => undefined);
      setPrecio(''); setMensaje('Precio actualizado.');
    } catch (e) {
      setMensaje(e instanceof ApiError && e.codigo === 'SIN_PERMISO'
        ? 'Sólo el administrador puede cambiar el precio por hora.'
        : e instanceof Error ? e.message : 'No se pudo cambiar el precio.');
    } finally {
      setCambiandoPrecio(false);
    }
  };

  if (!autorizado) return <Screen><StateView>
    <Text>Esta sección es para el personal del complejo.</Text>
    <Button title={usuario ? 'Volver a las canchas' : 'Iniciar sesión'} onPress={() => router.push(usuario ? '/(tabs)' : '/login')} />
  </StateView></Screen>;

  return <KeyboardAvoidingView style={uiLayout.grow} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollScreen contentContainerStyle={{ gap: spacing.lg }}>
      <Text variant="title">Canchas</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
        {espacios.map(e => <Chip key={e.id} selected={espacioId === e.id} disabled={cargandoEspacios || cambiandoPrecio}
          onPress={() => { setEspacioId(e.id); setPrecio(''); }}>{e.nombre}</Chip>)}
      </ScrollView>
      {cargandoEspacios && <ActivityIndicator color={colors.primary} />}
      {!espacios.length && !cargandoEspacios && <Button title="Reintentar carga" onPress={cargar} />}

      <BloqueosPanel espacios={espacios} />

      {espacio && <>
        <FijasPanel key={`${usuario?.id}:${espacio.id}`} espacioId={espacio.id} editable={autorizado} />
        {autorizado && <Surface style={uiLayout.section}>
          <Text variant="subtitle">Cambiar precio por hora</Text>
          <Text numeric>Precio actual: {precioLegible(espacio.precioPorHora)}</Text>
          <TextField label="Nuevo precio" keyboardType="number-pad" value={precio} onChangeText={setPrecio} editable={!cambiandoPrecio} />
          <Button title="Actualizar precio" onPress={cambiarPrecio} disabled={cambiandoPrecio} />
        </Surface>}
      </>}

      {mensaje && <DialogoAviso titulo="Administración" mensaje={mensaje} accionPrincipal="Entendido" onConfirmar={() => setMensaje(null)} onCerrar={() => setMensaje(null)} />}
    </ScrollScreen>
  </KeyboardAvoidingView>;
}
