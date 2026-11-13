import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Button, Chip, Surface, Text, TextField, uiLayout } from '../ui';
import { DialogoAviso } from '../DialogoAviso';
import { CalendarioCancha } from './CalendarioCancha';
import { HojaModal } from './HojaModal';
import { SelectorCancha } from './SelectorCancha';
import { SelectorFranjas } from './SelectorFranjas';
import { operacionesService, type EntradaBloqueo } from '../../services/operaciones';
import { invalidarGrillaLocal, notificarCambioDeTurnos } from '../../services/invalidacionGrilla';
import { errorDeRangoHorario } from '../../utils/horarios';
import { fechaArgentina, fechaLegible, horarioDeReserva, instanteTurno } from '../../utils/fechas';
import { nombreCorto } from '../../canchas/modelo';
import { spacing, useTheme } from '../../theme';
import type { Bloqueo, Espacio } from '../../tipos';

/** Motivos frecuentes del complejo: se elige uno o se escribe el propio. */
const MOTIVOS = ['Lluvia', 'Mantenimiento', 'Cancha anegada'];

interface BloqueosPanelProps {
  espacios: Espacio[];
}

/**
 * Bloqueos de mantenimiento: se elige la cancha, la fecha, la franja y el motivo;
 * antes de confirmar se muestran las reservas afectadas.
 */
export function BloqueosPanel({ espacios }: BloqueosPanelProps) {
  const { colors } = useTheme();
  const [espacioIds, setEspacioIds] = useState<string[]>([]);
  const [fecha, setFecha] = useState(fechaArgentina());
  const [diaEntero, setDiaEntero] = useState(true);
  const [inicio, setInicio] = useState<string | null>(null);
  const [fin, setFin] = useState<string | null>(null);
  const [motivo, setMotivo] = useState('');
  const [motivoPropio, setMotivoPropio] = useState('');
  const [bloqueos, setBloqueos] = useState<Bloqueo[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [aBajar, setABajar] = useState<Bloqueo | null>(null);
  const [hojaAbierta, setHojaAbierta] = useState(false);
  const [revision, setRevision] = useState<{ entrada: EntradaBloqueo; afectados: string[] } | null>(null);
  const operando = useRef(false);
  const generacion = useRef(0);

  useEffect(() => {
    setEspacioIds(vigentes => {
      const validos = vigentes.filter(id => espacios.some(e => e.id === id));
      return validos.length ? validos : espacios[0] ? [espacios[0].id] : [];
    });
  }, [espacios]);

  const cargarBloqueos = useCallback(async () => {
    const version = ++generacion.current;
    setBloqueos([]);
    setError(null);
    setCargando(espacioIds.length > 0);
    if (!espacioIds.length) return;
    try {
      const listas = await Promise.all(espacioIds.map(id => operacionesService.listarBloqueos(id, fechaArgentina())));
      if (version !== generacion.current) return;
      setBloqueos(listas.flat().sort((a, b) =>
        a.fecha.localeCompare(b.fecha) || (a.inicio ?? '').localeCompare(b.inicio ?? '') || a.id.localeCompare(b.id)));
    } catch (e) {
      if (version === generacion.current) setError(e instanceof Error ? e.message : 'No se pudieron cargar los bloqueos.');
    } finally {
      if (version === generacion.current) setCargando(false);
    }
  }, [espacioIds]);

  useEffect(() => {
    void cargarBloqueos();
    return () => { generacion.current++; };
  }, [cargarBloqueos]);

  const nombreDe = (id: string) => {
    const espacio = espacios.find(e => e.id === id);
    return espacio ? nombreCorto(espacio) : id;
  };

  const motivoElegido = motivoPropio.trim() || motivo;

  const abrirHoja = () => {
    setRevision(null);
    setHojaAbierta(true);
  };

  const revisar = async () => {
    if (operando.current) return;
    if (!espacioIds.length) { setAviso('Elegí al menos una cancha.'); return; }
    if (!motivoElegido.trim()) { setAviso('Escribí el motivo del bloqueo.'); return; }
    if (!diaEntero) {
      if (!inicio || !fin) { setAviso('Elegí la hora de inicio y la de fin.'); return; }
      const problema = errorDeRangoHorario(inicio, fin);
      if (problema) { setAviso(problema); return; }
    }
    const entrada: EntradaBloqueo = {
      espacioIds, fecha, motivo: motivoElegido.trim(),
      inicio: diaEntero ? undefined : inicio ?? undefined,
      fin: diaEntero ? undefined : fin ?? undefined,
    };
    operando.current = true;
    setOcupado(true);
    try {
      const reservas = await operacionesService.listarReservasDelDia(entrada.fecha);
      const ahora = Date.now();
      const lista = reservas.flatMap(reserva => {
        if (reserva.estado !== 'confirmada' || !entrada.espacioIds.includes(reserva.espacioId)) return [];
        const horario = horarioDeReserva(reserva.cancelableHasta);
        if (!horario || horario.fecha !== entrada.fecha || instanteTurno(entrada.fecha, horario.fin).getTime() <= ahora) return [];
        if (entrada.inicio && entrada.fin && (horario.inicio < entrada.inicio || horario.inicio >= entrada.fin)) return [];
        return [`${nombreDe(reserva.espacioId)} · ${horario.inicio}`];
      });
      setRevision({ entrada, afectados: lista });
    } catch (e) {
      setAviso(e instanceof Error ? e.message : 'No pudimos consultar las reservas afectadas.');
    } finally {
      setOcupado(false);
      operando.current = false;
    }
  };

  const crear = async () => {
    if (operando.current || !revision) return;
    const { entrada } = revision;
    operando.current = true;
    setOcupado(true);
    try {
      const creados = await operacionesService.bloquear(entrada);
      setHojaAbierta(false);
      setRevision(null);
      setMotivo(''); setMotivoPropio(''); setInicio(null); setFin(null); setDiaEntero(true);
      setAviso(creados.length === 1
        ? 'Bloqueo creado. Las reservas afectadas fueron canceladas.'
        : `${creados.length} bloqueos creados. Las reservas afectadas fueron canceladas.`);
      await cargarBloqueos();
      await Promise.all(entrada.espacioIds.map(id => invalidarGrillaLocal(id).catch(() => undefined)));
      notificarCambioDeTurnos();
    } catch (e) {
      setAviso(e instanceof Error ? e.message : 'No se pudo crear el bloqueo.');
    } finally {
      setOcupado(false);
      operando.current = false;
    }
  };

  const cancelar = async () => {
    if (!aBajar || operando.current) return;
    operando.current = true;
    setOcupado(true);
    try {
      await operacionesService.cancelarBloqueo(aBajar.id);
      setABajar(null);
      setAviso('Bloqueo dado de baja. Las reservas que canceló siguen canceladas.');
      await cargarBloqueos();
      await invalidarGrillaLocal(aBajar.espacioId).catch(() => undefined);
      notificarCambioDeTurnos();
    } catch (e) {
      setABajar(null);
      setAviso(e instanceof Error ? e.message : 'No se pudo cancelar el bloqueo.');
    } finally {
      setOcupado(false);
      operando.current = false;
    }
  };

  return <View style={styles.contenedor}>
    <View style={uiLayout.row}>
      <Text variant="subtitle" style={uiLayout.grow}>Bloqueos vigentes</Text>
      <Button size="sm" title="Bloquear" onPress={abrirHoja} />
    </View>

    {cargando && <ActivityIndicator color={colors.primary} />}
    {error && <Text selectable accessibilityRole="alert" tone="danger">{error}</Text>}
    {!cargando && !error && !bloqueos.length && <Text tone="muted">No hay bloqueos en las canchas elegidas.</Text>}
    {bloqueos.map(bloqueo => <View key={bloqueo.id} style={[styles.bloqueo, { borderColor: colors.border }]}>
      <View style={uiLayout.grow}>
        <Text variant="label">{nombreDe(bloqueo.espacioId)} · {fechaLegible(bloqueo.fecha)}</Text>
        <Text numeric variant="caption" tone="primary">
          {bloqueo.inicio && bloqueo.fin ? `${bloqueo.inicio}–${bloqueo.fin}` : 'Todo el día'}
        </Text>
        <Text variant="caption" tone="muted">{bloqueo.motivo}</Text>
      </View>
      <Button size="sm" variant="ghost" title="Dar de baja" disabled={ocupado} onPress={() => setABajar(bloqueo)} />
    </View>)}

    <HojaModal visible={hojaAbierta} titulo={revision ? 'Revisar bloqueo' : 'Bloquear canchas'}
      onCerrar={() => { if (!operando.current) setHojaAbierta(false); }}
      pie={<View style={uiLayout.row}>
        <Button variant="ghost" style={uiLayout.grow} title={revision ? 'Editar datos' : 'Cancelar'} disabled={ocupado}
          onPress={() => { if (revision) setRevision(null); else setHojaAbierta(false); }} />
        {revision
          ? <Button style={uiLayout.grow} title="Confirmar bloqueo" loading={ocupado} disabled={ocupado} onPress={() => void crear()} />
          : <Button style={uiLayout.grow} title="Revisar" loading={ocupado} disabled={ocupado} onPress={() => void revisar()} />}
      </View>}>
      {!revision && <>
        <SelectorCancha espacios={espacios} seleccionados={espacioIds} onChange={setEspacioIds}
          etiqueta="Canchas a bloquear" multiple />

        <View style={styles.bloque}>
          <Text variant="label" tone="muted">Fecha</Text>
          <CalendarioCancha valor={fecha} onChange={setFecha} minimo={fechaArgentina()} />
        </View>

        <View style={styles.bloque}>
          <Text variant="label" tone="muted">Horario</Text>
          <View style={styles.chips}>
            <Chip selected={diaEntero} onPress={() => { setDiaEntero(true); setInicio(null); setFin(null); }}>Todo el día</Chip>
            <Chip selected={!diaEntero} onPress={() => setDiaEntero(false)}>Franja horaria</Chip>
          </View>
          {!diaEntero && <SelectorFranjas inicio={inicio} fin={fin}
            onChange={(nuevoInicio, nuevoFin) => { setInicio(nuevoInicio); setFin(nuevoFin); }} />}
        </View>

        <View style={styles.bloque}>
          <Text variant="label" tone="muted">Motivo</Text>
          <View style={styles.chips}>
            {MOTIVOS.map(opcion => <Chip key={opcion} selected={motivo === opcion && !motivoPropio.trim()}
              onPress={() => { setMotivo(opcion); setMotivoPropio(''); }}>{opcion}</Chip>)}
          </View>
          <Button variant="ghost" size="sm" title="Otro motivo" onPress={() => setMotivo('')} />
          <TextField label="Motivo escrito" value={motivoPropio} onChangeText={setMotivoPropio} placeholder="Escribí el motivo" />
        </View>
      </>}

      {revision && <Surface variant="outlined" style={styles.resumen}>
        <Text variant="label">Resumen</Text>
        <Text variant="caption" tone="muted">
          {revision.entrada.espacioIds.map(nombreDe).join(', ')} · {fechaLegible(revision.entrada.fecha)} ·{' '}
          {revision.entrada.inicio ? `${revision.entrada.inicio}–${revision.entrada.fin}` : 'Todo el día'} · {revision.entrada.motivo}
        </Text>
        {revision.afectados.length
          ? <Text variant="caption" tone="warning">{revision.afectados.length} reservas podrían cancelarse: {revision.afectados.join(', ')}</Text>
          : <Text variant="caption" tone="muted">Al consultar, no había reservas afectadas en ese horario.</Text>}
      </Surface>}
    </HojaModal>

    {aBajar && <DialogoAviso titulo="Dar de baja bloqueo"
      detalle={`${nombreDe(aBajar.espacioId)} · ${fechaLegible(aBajar.fecha)}`}
      mensaje="Las reservas que este bloqueo canceló siguen canceladas." accionPrincipal="Dar de baja"
      accionSecundaria="Volver" onConfirmar={cancelar} onCerrar={() => setABajar(null)} />}
    {aviso && <DialogoAviso titulo="Bloqueos" mensaje={aviso} accionPrincipal="Entendido"
      onConfirmar={() => setAviso(null)} onCerrar={() => setAviso(null)} />}
  </View>;
}

const styles = StyleSheet.create({
  contenedor: { gap: spacing.md },
  bloqueo: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.sm, borderBottomWidth: 1,
  },
  bloque: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  resumen: { gap: spacing.xs, padding: spacing.md },
});
