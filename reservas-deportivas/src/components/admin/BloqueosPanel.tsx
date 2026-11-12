import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { Button, Chip, Surface, Text, TextField, uiLayout } from '../ui';
import { DialogoAviso } from '../DialogoAviso';
import { operacionesService, type EntradaBloqueo } from '../../services/operaciones';
import { errorDeFecha, errorDeRangoHorario } from '../../utils/horarios';
import { fechaArgentina, fechaLegible, horarioDeReserva, instanteTurno } from '../../utils/fechas';
import { spacing, useTheme } from '../../theme';
import type { Bloqueo, Espacio } from '../../tipos';

interface BloqueosPanelProps {
  espacios: Espacio[];
}

/**
 * Bloqueos de mantenimiento: selección múltiple de espacios, día entero o
 * rango horario, y baja de bloqueos vigentes desde hoy.
 */
export function BloqueosPanel({ espacios }: BloqueosPanelProps) {
  const { colors } = useTheme();
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [fecha, setFecha] = useState(fechaArgentina());
  const [motivo, setMotivo] = useState('');
  const [diaEntero, setDiaEntero] = useState(true);
  const [inicio, setInicio] = useState('');
  const [fin, setFin] = useState('');
  const [bloqueos, setBloqueos] = useState<Bloqueo[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [confirmar, setConfirmar] = useState<{ entrada: EntradaBloqueo; afectados: string[] } | null>(null);
  const operando = useRef(false);
  const generacion = useRef(0);
  const [aCancelar, setACancelar] = useState<Bloqueo | null>(null);

  useEffect(() => {
    setSeleccionados(vigentes => {
      const validos = vigentes.filter(id => espacios.some(e => e.id === id));
      return validos.length ? validos : espacios[0] ? [espacios[0].id] : [];
    });
  }, [espacios]);

  const cargarBloqueos = useCallback(async () => {
    const version = ++generacion.current;
    setBloqueos([]);
    setError(null);
    setCargando(seleccionados.length > 0);
    if (!seleccionados.length) return;
    try {
      const listas = await Promise.all(seleccionados.map(id => operacionesService.listarBloqueos(id, fechaArgentina())));
      if (version !== generacion.current) return;
      setBloqueos(listas.flat().sort((a, b) =>
        a.fecha.localeCompare(b.fecha) || (a.inicio ?? '').localeCompare(b.inicio ?? '') || a.id.localeCompare(b.id)));
    } catch (e) {
      if (version === generacion.current) setError(e instanceof Error ? e.message : 'No se pudieron cargar los bloqueos.');
    } finally {
      if (version === generacion.current) setCargando(false);
    }
  }, [seleccionados]);

  useEffect(() => {
    void cargarBloqueos();
    return () => { generacion.current++; };
  }, [cargarBloqueos]);

  const alternar = (id: string) => {
    setSeleccionados(vigentes => vigentes.includes(id)
      ? vigentes.filter(actual => actual !== id)
      : [...vigentes, id]);
  };

  const abrirConfirmacion = async () => {
    if (operando.current || !seleccionados.length) return;
    if (!motivo.trim()) { setAviso('Escribí un motivo para el bloqueo.'); return; }
    const errorFecha = errorDeFecha(fecha);
    if (errorFecha) { setAviso(errorFecha); return; }
    if (!diaEntero && !inicio.trim() && !fin.trim()) {
      setAviso('Si acotás el horario, completá la hora de inicio y la de fin.');
      return;
    }
    const errorHoras = diaEntero ? null : errorDeRangoHorario(inicio.trim() || null, fin.trim() || null);
    if (errorHoras) { setAviso(errorHoras); return; }
    const entrada: EntradaBloqueo = {
      espacioIds: seleccionados, fecha, motivo,
      inicio: diaEntero ? undefined : inicio.trim(),
      fin: diaEntero ? undefined : fin.trim(),
    };
    operando.current = true;
    setOcupado(true);
    try {
      const reservas = await operacionesService.listarReservasDelDia(fecha);
      const ahora = Date.now();
      const afectados = reservas.flatMap(reserva => {
        if (reserva.estado !== 'confirmada' || !entrada.espacioIds.includes(reserva.espacioId)) return [];
        const horario = horarioDeReserva(reserva.cancelableHasta);
        if (!horario || horario.fecha !== fecha || instanteTurno(fecha, horario.fin).getTime() <= ahora) return [];
        if (entrada.inicio && entrada.fin && (horario.inicio < entrada.inicio || horario.inicio >= entrada.fin)) return [];
        return [nombreDe(reserva.espacioId) + ' · ' + horario.inicio];
      });
      setConfirmar({ entrada, afectados });
    } catch (e) {
      setAviso(e instanceof Error ? e.message : 'No pudimos consultar las reservas afectadas.');
    } finally {
      setOcupado(false);
      operando.current = false;
    }
  };

  const crear = async () => {
    if (operando.current || !confirmar) return;
    const { entrada } = confirmar;
    operando.current = true;
    setConfirmar(null);
    setOcupado(true);
    try {
      const creados = await operacionesService.bloquear(entrada);
      setMotivo(''); setInicio(''); setFin(''); setDiaEntero(true);
      setAviso(creados.length === 1
        ? 'Bloqueo creado. Las reservas afectadas fueron canceladas.'
        : `${creados.length} bloqueos creados. Las reservas afectadas fueron canceladas.`);
      await cargarBloqueos();
    } catch (e) {
      setAviso(e instanceof Error ? e.message : 'No se pudo crear el bloqueo.');
    } finally {
      setOcupado(false);
      operando.current = false;
    }
  };

  const cancelar = async () => {
    if (!aCancelar || operando.current) return;
    operando.current = true;
    setOcupado(true);
    try {
      await operacionesService.cancelarBloqueo(aCancelar.id);
      setACancelar(null);
      setAviso('Bloqueo dado de baja. Las reservas que canceló siguen canceladas.');
      await cargarBloqueos();
    } catch (e) {
      setACancelar(null);
      setAviso(e instanceof Error ? e.message : 'No se pudo cancelar el bloqueo.');
    } finally {
      setOcupado(false);
      operando.current = false;
    }
  };

  const nombreDe = (id: string) => espacios.find(e => e.id === id)?.nombre ?? id;

  return <Surface style={uiLayout.section}>
    <Text variant="subtitle">Bloqueos de mantenimiento</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
      {espacios.map(e => <Chip key={e.id} selected={seleccionados.includes(e.id)} disabled={ocupado}
        onPress={() => alternar(e.id)}>{e.nombre}</Chip>)}
    </ScrollView>

    <TextField label="Fecha (año-mes-día)" value={fecha} onChangeText={setFecha} editable={!ocupado} maxLength={10} />
    <TextField label="Motivo" value={motivo} onChangeText={setMotivo} editable={!ocupado} />
    <View style={uiLayout.row}>
      <Chip selected={diaEntero} disabled={ocupado} onPress={() => setDiaEntero(true)}>Día entero</Chip>
      <Chip selected={!diaEntero} disabled={ocupado} onPress={() => setDiaEntero(false)}>Por horario</Chip>
    </View>
    {!diaEntero && <View style={uiLayout.row}>
      <View style={uiLayout.grow}>
        <TextField label="Hora inicio" value={inicio} onChangeText={setInicio} editable={!ocupado}
          keyboardType="numbers-and-punctuation" maxLength={5} placeholder="08:00" autoCapitalize="none" />
      </View>
      <View style={uiLayout.grow}>
        <TextField label="Hora fin" value={fin} onChangeText={setFin} editable={!ocupado}
          keyboardType="numbers-and-punctuation" maxLength={5} placeholder="24:00" autoCapitalize="none" />
      </View>
    </View>}
    <Button title="Bloquear" variant="destructive" loading={ocupado} disabled={!seleccionados.length} onPress={abrirConfirmacion} />

    {cargando && <ActivityIndicator color={colors.primary} />}
    {error && <Text selectable accessibilityRole="alert" tone="danger">{error}</Text>}
    {bloqueos.length > 0 && <Text variant="label" tone="muted">Vigentes desde hoy</Text>}
    {bloqueos.map(b => <View key={b.id} style={[uiLayout.fila, { borderColor: colors.border }]}>
      <View style={uiLayout.grow}>
        <Text variant="label">{nombreDe(b.espacioId)} · {fechaLegible(b.fecha)}</Text>
        <Text numeric variant="label" tone="primary">{b.inicio && b.fin ? `${b.inicio}–${b.fin}` : 'Día entero'}</Text>
        <Text variant="label" tone="muted">{b.motivo}</Text>
      </View>
      <Button size="sm" variant="ghost" title="Dar de baja" disabled={ocupado} onPress={() => setACancelar(b)} />
    </View>)}
    {!cargando && !error && !bloqueos.length && <Text tone="muted">Sin bloqueos vigentes en las canchas elegidas.</Text>}

    {confirmar && <DialogoAviso titulo="Confirmar bloqueo"
      mensaje={confirmar.afectados.length
        ? 'Se cancelarán las reservas afectadas según la disponibilidad al confirmar.'
        : 'La consulta no encontró reservas afectadas.'}
      detalle={[
        fechaLegible(confirmar.entrada.fecha),
        confirmar.entrada.inicio ? `${confirmar.entrada.inicio}–${confirmar.entrada.fin}` : 'Día entero',
        confirmar.entrada.espacioIds.map(nombreDe).join(', '),
        `${confirmar.afectados.length} reservas afectadas`,
        ...confirmar.afectados,
      ].join('\n')}
      destructivo accionPrincipal="Bloquear" accionSecundaria="Volver" onConfirmar={crear} onCerrar={() => setConfirmar(null)} />}
    {aCancelar && <DialogoAviso titulo="Dar de baja bloqueo"
      detalle={`${nombreDe(aCancelar.espacioId)} · ${fechaLegible(aCancelar.fecha)}`}
      mensaje="Las reservas que este bloqueo canceló siguen canceladas." accionPrincipal="Dar de baja"
      accionSecundaria="Volver" onConfirmar={cancelar} onCerrar={() => setACancelar(null)} />}
    {aviso && <DialogoAviso titulo="Bloqueos" mensaje={aviso} accionPrincipal="Entendido"
      onConfirmar={() => setAviso(null)} onCerrar={() => setAviso(null)} />}
  </Surface>;
}
