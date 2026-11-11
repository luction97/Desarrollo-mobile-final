import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Chip, ScrollScreen, Screen, StateView, Surface, Text, TextField, uiLayout } from '../src/components/ui';
import { DialogoAviso } from '../src/components/DialogoAviso';
import { useAuth } from '../src/context/AuthContext';
import { operacionesService } from '../src/services/operaciones';
import { fechaArgentina, fechaLegible } from '../src/utils/fechas';
import { spacing, useTheme } from '../src/theme';
import type { Espacio } from '../src/tipos';

export default function AdminScreen() {
  const { usuario } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const autorizado = usuario?.rol === 'administrador' || usuario?.rol === 'encargado';
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [espacioId, setEspacioId] = useState('');
  const [fecha, setFecha] = useState(fechaArgentina());
  const [motivo, setMotivo] = useState('');
  const [precio, setPrecio] = useState('');
  const [cargando, setCargando] = useState(false);
  const [cargandoEspacios, setCargandoEspacios] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState(false);
  const espacio = espacios.find(e => e.id === espacioId);

  const cargar = async () => {
    setCargandoEspacios(true);
    try { const datos = await operacionesService.obtenerEspacios(); setEspacios(datos); setEspacioId(actual => actual || datos[0]?.id || ''); }
    catch (e) { setMensaje(e instanceof Error ? e.message : 'No se pudieron cargar las canchas.'); }
    finally { setCargandoEspacios(false); }
  };
  useEffect(() => { if (autorizado) void cargar(); }, [autorizado]);

  const bloquear = async () => {
    if (!espacio || cargando) return;
    setConfirmar(false); setCargando(true);
    try { await operacionesService.bloquearDia(espacio.id, fecha, motivo); setMotivo(''); setMensaje('Día bloqueado. Las reservas afectadas fueron canceladas.'); }
    catch (e) { setMensaje(e instanceof Error ? e.message : 'No se pudo crear el bloqueo.'); }
    finally { setCargando(false); }
  };

  const cambiarPrecio = async () => {
    if (!espacio || cargando || usuario?.rol !== 'administrador') return;
    if (!precio.trim() || !Number.isInteger(Number(precio)) || Number(precio) <= 0) { setMensaje('Ingresá un precio entero, mayor que cero.'); return; }
    setCargando(true);
    try {
      const actualizado = await operacionesService.cambiarPrecio(espacio.id, Number(precio));
      setEspacios(datos => datos.map(e => e.id === actualizado.id ? actualizado : e));
      setPrecio(''); setMensaje('Precio actualizado.');
    } catch (e) { setMensaje(e instanceof Error ? e.message : 'No se pudo cambiar el precio.'); }
    finally { setCargando(false); }
  };

  if (!autorizado) return <Screen><StateView><Text>Acceso restringido al personal.</Text><Button title="Iniciar sesión" onPress={() => router.push('/login')} /></StateView></Screen>;
  return <KeyboardAvoidingView style={uiLayout.grow} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <ScrollScreen>
      <ScrollView horizontal contentContainerStyle={{ gap: spacing.sm }}>
        {espacios.map(e => <Chip key={e.id} selected={espacioId === e.id} disabled={cargando} onPress={() => setEspacioId(e.id)}>{e.nombre}</Chip>)}
      </ScrollView>
      {cargandoEspacios && <ActivityIndicator color={colors.primary} />}
      {!espacios.length && !cargandoEspacios && <Button title="Reintentar carga" onPress={cargar} />}
      {espacio && <>
        <Surface style={uiLayout.section}>
          <Text variant="subtitle">Bloquear día</Text>
          <Text>{espacio.nombre}</Text>
          <TextField label="Fecha (AAAA-MM-DD)" value={fecha} onChangeText={setFecha} editable={!cargando} maxLength={10} />
          <TextField label="Motivo" value={motivo} onChangeText={setMotivo} editable={!cargando} />
          <Button title="Bloquear Día" variant="destructive" disabled={cargando} onPress={() => {
            if (!motivo.trim()) { setMensaje('Escribí un motivo para el bloqueo.'); return; }
            if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !Number.isFinite(new Date(`${fecha}T12:00:00-03:00`).getTime())) { setMensaje('Ingresá una fecha válida.'); return; }
            setConfirmar(true);
          }} />
        </Surface>
        {usuario?.rol === 'administrador' && <Surface style={uiLayout.section}>
          <Text variant="subtitle">Cambiar precio por hora</Text>
          <Text numeric>Precio actual: {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(espacio.precioPorHora)}</Text>
          <TextField label="Nuevo precio" keyboardType="number-pad" value={precio} onChangeText={setPrecio} editable={!cargando} />
          <Button title="Actualizar Precio" onPress={cambiarPrecio} disabled={cargando} />
        </Surface>}
      </>}
      {confirmar && <DialogoAviso titulo="Bloquear día" mensaje="Se cancelarán las reservas afectadas."
        detalle={`${espacio?.nombre} · ${fechaLegible(fecha)}`} destructivo accionPrincipal="Confirmar bloqueo" accionSecundaria="Volver" onConfirmar={bloquear} onCerrar={() => setConfirmar(false)} />}
      {mensaje && <DialogoAviso titulo="Administración" mensaje={mensaje} accionPrincipal="Entendido" onConfirmar={() => setMensaje(null)} onCerrar={() => setMensaje(null)} />}
    </ScrollScreen>
  </KeyboardAvoidingView>;
}
