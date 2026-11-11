import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Badge, Button, Chip, Screen, StateView, Surface, Text, uiLayout } from '../src/components/ui';
import { spacing, useTheme } from '../src/theme';
import { CodigoQr } from '../src/components/CodigoQr';
import { DialogoAviso } from '../src/components/DialogoAviso';
import { api } from '../src/services/api';
import { operacionesService } from '../src/services/operaciones';
import { fechaArgentina, fechaLegible } from '../src/utils/fechas';
import type { Espacio, Reserva } from '../src/tipos';

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
  const [fecha, setFecha] = useState(fechaArgentina());
  const [dias] = useState(() => Array.from({ length: 7 }, (_, i) => {
    const dia = new Date(`${fechaArgentina()}T12:00:00-03:00`);
    dia.setUTCDate(dia.getUTCDate() + i);
    return { fecha: fechaArgentina(dia), nombre: i === 0 ? 'Hoy' : new Intl.DateTimeFormat('es-AR', { weekday: 'short', timeZone: 'America/Argentina/Buenos_Aires' }).format(dia) };
  }));
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [espacios, setEspacios] = useState<Espacio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmacion, setConfirmacion] = useState<Reserva | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [marcando, setMarcando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true); setError(null);
    try {
      const [lista, canchas] = await Promise.all([
        api.listarTodo<Reserva>(`/reservas?fecha=${encodeURIComponent(fecha)}`),
        operacionesService.obtenerEspacios(),
      ]);
      setReservas(lista);
      setEspacios(canchas);
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
      await operacionesService.marcarAusente(confirmacion.id);
      setConfirmacion(null);
      setMensaje('Ausencia registrada.');
      await cargar();
    } catch (e) {
      setConfirmacion(null);
      setMensaje(e instanceof Error ? e.message : 'No se pudo registrar la ausencia.');
    } finally {
      setMarcando(false);
    }
  };

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
          const espacio = espacios.find(e => e.id === item.espacioId);
          return <Surface style={uiLayout.section}>
            <View style={uiLayout.row}>
              <View style={uiLayout.grow}>
                <Text variant="subtitle">{espacio?.nombre ?? 'Espacio no disponible'}</Text>
                {datos && <Text numeric variant="label" tone="primary">{datos.fecha} · {datos.hora}</Text>}
              </View>
              <Badge variant={item.estado === 'confirmada' ? 'success' : 'neutral'}>{item.estado.toUpperCase()}</Badge>
            </View>
            <CodigoQr size="sm" value={item.codigoQr} />
            <Text selectable variant="label" tone="muted">Código: {item.codigoQr}</Text>
            <Text variant="label" tone="muted">Personas: {item.cantidadPersonas}</Text>
            {item.ingresoEn && <Text variant="label" tone="muted">Ingreso: {new Date(item.ingresoEn).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</Text>}
            {item.estado === 'confirmada' && <Button variant="destructive" title="Marcar ausente" disabled={marcando} onPress={() => setConfirmacion(item)} />}
          </Surface>;
        }} />}
    {confirmacion && <DialogoAviso titulo="Marcar ausente" mensaje="La reserva quedará registrada como no presentada."
      detalle={`${espacios.find(e => e.id === confirmacion.espacioId)?.nombre ?? 'Espacio'} · ${datosDelQr(confirmacion.codigoQr)?.hora ?? ''}`}
      destructivo accionPrincipal="Marcar ausente" accionSecundaria="Volver" onConfirmar={marcarAusente} onCerrar={() => setConfirmacion(null)} />}
    {mensaje && <DialogoAviso titulo="Agenda" mensaje={mensaje} accionPrincipal="Entendido" onConfirmar={() => setMensaje(null)} onCerrar={() => setMensaje(null)} />}
  </Screen>;
}
