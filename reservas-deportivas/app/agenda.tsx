import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Badge, Button, Chip, Screen, StateView, Surface, Text, uiLayout } from '../src/components/ui';
import { spacing, useTheme } from '../src/theme';
import { CodigoQr } from '../src/components/CodigoQr';
import { DialogoAviso } from '../src/components/DialogoAviso';
import { useAuth } from '../src/context/AuthContext';
import { operacionesService } from '../src/services/operaciones';
import { obtenerEspacios } from '../src/services/espacios';
import { ZONA, fechaArgentina, fechaLegible } from '../src/utils/fechas';
import type { Reserva, Usuario } from '../src/tipos';

function datosDelQr(codigoQr: string) {
  const partes = codigoQr.split('-');
  if (partes.length < 3) return null;
  const mesDia = partes[1];
  const hora = partes[2];
  if (!/^\d{4}$/.test(mesDia) || !/^\d{2}$/.test(hora)) return null;
  return { fecha: `${mesDia.slice(2, 4)}/${mesDia.slice(0, 2)}`, hora: `${hora}:00` };
}

export default function AgendaScreen() {
  const { colors } = useTheme();
  const { usuario } = useAuth();
  const router = useRouter();
  const autorizado = usuario?.rol === 'administrador' || usuario?.rol === 'encargado';
  const [fecha, setFecha] = useState(fechaArgentina());
  const [dias] = useState(() => Array.from({ length: 7 }, (_, i) => {
    const dia = new Date(`${fechaArgentina()}T12:00:00-03:00`);
    dia.setUTCDate(dia.getUTCDate() + i);
    return { fecha: fechaArgentina(dia), nombre: i === 0 ? 'Hoy' : new Intl.DateTimeFormat('es-AR', { weekday: 'short', timeZone: ZONA }).format(dia) };
  }));
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [titulares, setTitulares] = useState<Record<string, Usuario>>({});
  const [espacios, setEspacios] = useState<Record<string, string>>({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmacion, setConfirmacion] = useState<Reserva | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [marcando, setMarcando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true); setError(null);
    try {
      const lista = await operacionesService.listarReservasDelDia(fecha);
      const { datos: nombres } = await obtenerEspacios();
      setEspacios(Object.fromEntries(nombres.map(e => [e.id, e.nombre])));
      // El titular de cada reserva se consulta una sola vez por usuario.
      const ids = [...new Set(lista.map(r => r.usuarioId))];
      const personas = await Promise.all(ids.map(id =>
        operacionesService.obtenerUsuario(id).catch(() => null)));
      const registrados = Object.fromEntries(personas.flatMap(p => p ? [[p.id, p] as const] : []));
      setTitulares(registrados);
      setReservas(lista);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar la agenda.');
    } finally {
      setCargando(false);
    }
  }, [fecha]);

  useFocusEffect(useCallback(() => { void cargar(); }, [cargar]));

  const marcarAusente = async () => {
    if (!confirmacion || marcando) return;
    setMarcando(true);
    try {
      const reserva = await operacionesService.marcarAusente(confirmacion.id);
      setReservas(datos => datos.map(r => r.id === reserva.id ? reserva : r));
      const titular = titulares[reserva.usuarioId];
      if (titular) setTitulares(d => ({ ...d, [titular.id]: { ...titular, ausencias: titular.ausencias + 1 } }));
      setConfirmacion(null);
      setMensaje('Ausencia registrada.');
    } catch (e) {
      setConfirmacion(null);
      setMensaje(e instanceof Error ? e.message : 'No se pudo registrar la ausencia.');
    } finally {
      setMarcando(false);
    }
  };

  if (!autorizado) return <Screen><StateView>
    <Text>Acceso restringido al personal.</Text>
    <Button title="Iniciar sesión" onPress={() => router.push('/login')} />
  </StateView></Screen>;

  return <Screen topInset>
    <View style={uiLayout.inset}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
        {dias.map(d => <Chip key={d.fecha} selected={d.fecha === fecha} onPress={() => setFecha(d.fecha)}>
          {`${d.nombre} ${d.fecha.slice(-2)}`}
        </Chip>)}
      </ScrollView>
      <Text tone="muted">{fechaLegible(fecha)}</Text>
      {error && <Text selectable accessibilityRole="alert" tone="danger">{error}</Text>}
      {error && <Button title="Reintentar" variant="secondary" onPress={cargar} />}
    </View>
    {cargando ? <StateView><ActivityIndicator color={colors.primary} /><Text tone="muted">Cargando agenda...</Text></StateView>
      : <FlatList data={reservas} keyExtractor={item => item.id} contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={uiLayout.listContent}
        ListEmptyComponent={<StateView><Text tone="muted">No hay reservas para esta fecha.</Text></StateView>}
        renderItem={({ item }) => {
          const datos = datosDelQr(item.codigoQr);
          const titular = titulares[item.usuarioId];
          return <Surface style={uiLayout.section}>
            <View style={uiLayout.row}>
              <View style={uiLayout.grow}>
                <Text variant="subtitle">{espacios[item.espacioId] ?? 'Espacio no disponible'}</Text>
                {datos && <Text numeric variant="label" tone="primary">{datos.fecha} · {datos.hora}</Text>}
              </View>
              <Badge variant={item.estado === 'confirmada' ? 'success' : 'neutral'}>{item.estado.toUpperCase()}</Badge>
            </View>
            {titular && <View>
              <Text variant="label">{titular.nombre} · {titular.telefono}</Text>
              <Text variant="label" tone="muted">Ausencias: {titular.ausencias} · Cancelaciones tardías: {titular.cancelacionesTardias}</Text>
            </View>}
            <CodigoQr size="sm" value={item.codigoQr} />
            <Text selectable variant="label" tone="muted">Código: {item.codigoQr}</Text>
            <Text variant="label" tone="muted">Personas: {item.cantidadPersonas}</Text>
            {item.estado === 'confirmada' && <Button variant="destructive" title="Marcar ausente" disabled={marcando} onPress={() => setConfirmacion(item)} />}
          </Surface>;
        }} />}
    {confirmacion && <DialogoAviso titulo="Marcar ausente" mensaje="La reserva quedará registrada como no presentada."
      detalle={`${espacios[confirmacion.espacioId] ?? 'Espacio'} · ${datosDelQr(confirmacion.codigoQr)?.hora ?? ''}`}
      destructivo accionPrincipal="Marcar ausente" accionSecundaria="Volver" onConfirmar={marcarAusente} onCerrar={() => setConfirmacion(null)} />}
    {mensaje && <DialogoAviso titulo="Agenda" mensaje={mensaje} accionPrincipal="Entendido" onConfirmar={() => setMensaje(null)} onCerrar={() => setMensaje(null)} />}
  </Screen>;
}
