import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { Button, Chip, Surface, Text, TextField, uiLayout } from '../ui';
import { DialogoAviso } from '../DialogoAviso';
import { operacionesService } from '../../services/operaciones';
import { errorDeFecha, errorDeRangoHorario } from '../../utils/horarios';
import { fechaArgentina, fechaLegible } from '../../utils/fechas';
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
  const [confirmar, setConfirmar] = useState(false);
  const [aCancelar, setACancelar] = useState<Bloqueo | null>(null);

  useEffect(() => {
    setSeleccionados(vigentes => {
      const validos = vigentes.filter(id => espacios.some(e => e.id === id));
      return validos.length ? validos : espacios[0] ? [espacios[0].id] : [];
    });
  }, [espacios]);

  const cargarBloqueos = useCallback(async () => {
    if (!seleccionados.length) { setBloqueos([]); return; }
    setCargando(true); setError(null);
    try {
      const listas = await Promise.all(seleccionados.map(id => operacionesService.listarBloqueos(id, fechaArgentina())));
      setBloqueos(listas.flat().sort((a, b) =>
        a.fecha.localeCompare(b.fecha) || (a.inicio ?? '').localeCompare(b.inicio ?? '') || a.id.localeCompare(b.id)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron cargar los bloqueos.');
    } finally {
      setCargando(false);
    }
  }, [seleccionados]);

  useEffect(() => { void cargarBloqueos(); }, [cargarBloqueos]);

  const alternar = (id: string) => {
    setSeleccionados(vigentes => vigentes.includes(id)
      ? vigentes.filter(actual => actual !== id)
      : [...vigentes, id]);
  };

  const abrirConfirmacion = () => {
    if (ocupado) return;
    if (!motivo.trim()) { setAviso('Escribí un motivo para el bloqueo.'); return; }
    const errorFecha = errorDeFecha(fecha);
    if (errorFecha) { setAviso(errorFecha); return; }
    if (!diaEntero && !inicio.trim() && !fin.trim()) {
      setAviso('Si acotás el horario, completá la hora de inicio y la de fin.');
      return;
    }
    const errorHoras = diaEntero ? null : errorDeRangoHorario(inicio.trim() || null, fin.trim() || null);
    if (errorHoras) { setAviso(errorHoras); return; }
    setConfirmar(true);
  };

  const crear = async () => {
    if (ocupado) return;
    setConfirmar(false);
    setOcupado(true);
    try {
      const creados = await operacionesService.bloquear({
        espacioIds: seleccionados,
        fecha,
        motivo,
        inicio: diaEntero ? undefined : inicio.trim() || undefined,
        fin: diaEntero ? undefined : fin.trim() || undefined,
      });
      setMotivo(''); setInicio(''); setFin(''); setDiaEntero(true);
      setAviso(creados.length === 1
        ? 'Bloqueo creado. Las reservas afectadas fueron canceladas.'
        : `${creados.length} bloqueos creados. Las reservas afectadas fueron canceladas.`);
      await cargarBloqueos();
    } catch (e) {
      setAviso(e instanceof Error ? e.message : 'No se pudo crear el bloqueo.');
    } finally {
      setOcupado(false);
    }
  };

  const cancelar = async () => {
    if (!aCancelar || ocupado) return;
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
    }
  };

  const nombreDe = (id: string) => espacios.find(e => e.id === id)?.nombre ?? id;

  return <Surface style={uiLayout.section}>
    <Text variant="subtitle">Bloqueos de mantenimiento</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
      {espacios.map(e => <Chip key={e.id} selected={seleccionados.includes(e.id)} disabled={ocupado}
        onPress={() => alternar(e.id)}>{e.nombre}</Chip>)}
    </ScrollView>

    <TextField label="Fecha (AAAA-MM-DD)" value={fecha} onChangeText={setFecha} editable={!ocupado} maxLength={10} />
    <TextField label="Motivo" value={motivo} onChangeText={setMotivo} editable={!ocupado} />
    <View style={uiLayout.row}>
      <Chip selected={diaEntero} disabled={ocupado} onPress={() => setDiaEntero(true)}>Día entero</Chip>
      <Chip selected={!diaEntero} disabled={ocupado} onPress={() => setDiaEntero(false)}>Rango horario</Chip>
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
    <Button title="Bloquear" variant="destructive" disabled={ocupado || !seleccionados.length} onPress={abrirConfirmacion} />

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

    {confirmar && <DialogoAviso titulo="Bloquear" mensaje="Se cancelarán las reservas afectadas."
      detalle={`${seleccionados.length === 1 ? nombreDe(seleccionados[0]) : `${seleccionados.length} canchas`} · ${fechaLegible(fecha)}${diaEntero ? ' · día entero' : ` · ${inicio.trim()}–${fin.trim()}`}`}
      destructivo accionPrincipal="Confirmar bloqueo" accionSecundaria="Volver" onConfirmar={crear} onCerrar={() => setConfirmar(false)} />}
    {aCancelar && <DialogoAviso titulo="Dar de baja bloqueo"
      detalle={`${nombreDe(aCancelar.espacioId)} · ${fechaLegible(aCancelar.fecha)}`}
      mensaje="Las reservas que este bloqueo canceló siguen canceladas." accionPrincipal="Dar de baja"
      accionSecundaria="Volver" onConfirmar={cancelar} onCerrar={() => setACancelar(null)} />}
    {aviso && <DialogoAviso titulo="Bloqueos" mensaje={aviso} accionPrincipal="Entendido"
      onConfirmar={() => setAviso(null)} onCerrar={() => setAviso(null)} />}
  </Surface>;
}

