import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Button, Chip, Surface, Text, TextField, uiLayout } from '../ui';
import { DialogoAviso } from '../DialogoAviso';
import { CalendarioCancha } from './CalendarioCancha';
import { HojaModal } from './HojaModal';
import { SelectorCancha } from './SelectorCancha';
import { SelectorFranjas } from './SelectorFranjas';
import { fijasService, type DatosFija } from '../../services/fijas';
import { ApiError } from '../../services/api';
import { DIAS_SEMANA, errorDeFecha, errorDeRangoHorario } from '../../utils/horarios';
import { fechaArgentina, fechaLegible, finDeMes } from '../../utils/fechas';
import { nombreCorto } from '../../canchas/modelo';
import { spacing, useTheme } from '../../theme';
import type { Espacio, ReservaFija } from '../../tipos';

interface FijasPanelProps {
  espacios: Espacio[];
  /** El personal del complejo puede cargar y editar fijas; el servidor valida el rol (D6 de la API). */
  editable: boolean;
}

/**
 * Reservas fijas del complejo: lista de las series vigentes y alta o edición en
 * una hoja, con calendario, franjas seleccionables y un resumen legible.
 */
export function FijasPanel({ espacios, editable }: FijasPanelProps) {
  const { colors } = useTheme();
  const [espacioId, setEspacioId] = useState(espacios[0]?.id ?? '');
  const [fijas, setFijas] = useState<ReservaFija[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [titular, setTitular] = useState('');
  const [dia, setDia] = useState(1);
  const [inicio, setInicio] = useState<string | null>(null);
  const [fin, setFin] = useState<string | null>(null);
  const [desde, setDesde] = useState(fechaArgentina());
  const [hasta, setHasta] = useState<string | null>(null);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [hojaAbierta, setHojaAbierta] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [aBajar, setABajar] = useState<ReservaFija | null>(null);
  const generacion = useRef(0);
  const operando = useRef(false);

  useEffect(() => {
    if (!espacios.some(e => e.id === espacioId)) setEspacioId(espacios[0]?.id ?? '');
  }, [espacios, espacioId]);

  const cargar = useCallback(async () => {
    const version = ++generacion.current;
    if (!espacioId) { setFijas([]); setCargando(false); return; }
    setCargando(true); setError(null);
    try {
      const lista = await fijasService.listar(espacioId);
      if (version === generacion.current) setFijas(lista);
    } catch (e) {
      if (version === generacion.current) setError(e instanceof Error ? e.message : 'No se pudieron cargar las reservas fijas.');
    } finally {
      if (version === generacion.current) setCargando(false);
    }
  }, [espacioId]);

  useEffect(() => {
    void cargar();
    return () => { generacion.current++; };
  }, [cargar]);

  const nombreDe = (id: string) => {
    const espacio = espacios.find(e => e.id === id);
    return espacio ? nombreCorto(espacio) : id;
  };

  const abrirNueva = () => {
    setEditandoId(null);
    setTitular(''); setDia(1); setInicio(null); setFin(null);
    setDesde(fechaArgentina()); setHasta(null);
    setHojaAbierta(true);
  };

  const editar = (fija: ReservaFija) => {
    setEditandoId(fija.id);
    setTitular(fija.titular); setDia(fija.dia); setInicio(fija.inicio); setFin(fija.fin);
    setDesde(fija.desde); setHasta(fija.hasta ?? null);
    setHojaAbierta(true);
  };

  const guardar = async () => {
    if (!editable || operando.current || !espacioId || cargando || error) return;
    if (editandoId && !fijas.some(fija => fija.id === editandoId && fija.espacioId === espacioId)) return;
    if (!titular.trim()) { setAviso('Escribí el titular de la reserva.'); return; }
    const problemaFecha = errorDeFecha(desde);
    if (problemaFecha) { setAviso(problemaFecha); return; }
    if (hasta) {
      const problemaHasta = errorDeFecha(hasta);
      if (problemaHasta) { setAviso(problemaHasta); return; }
      if (hasta < desde) { setAviso('La fecha final no puede ser anterior a la inicial.'); return; }
    }
    const problemaHoras = errorDeRangoHorario(inicio, fin);
    if (problemaHoras) { setAviso(problemaHoras); return; }
    operando.current = true;
    setOcupado(true);
    const datos: DatosFija = {
      espacioId,
      titular: titular.trim(),
      dia: dia as DatosFija['dia'],
      inicio: inicio ?? '',
      fin: fin ?? '',
      desde,
      hasta: hasta ?? null,
    };
    try {
      if (editandoId) {
        await fijasService.editar(editandoId, datos);
        setAviso('Reserva fija actualizada.');
      } else {
        await fijasService.crear(datos);
        setAviso('Reserva fija creada.');
      }
      setHojaAbierta(false);
      await cargar();
    } catch (e) {
      setAviso(e instanceof ApiError && e.codigo === 'SIN_PERMISO'
        ? 'Sólo el administrador puede cargar y editar las reservas fijas.'
        : e instanceof Error ? e.message : 'No se pudo guardar la reserva fija.');
    } finally {
      setOcupado(false);
      operando.current = false;
    }
  };

  const darDeBaja = async () => {
    if (!editable || !aBajar || operando.current || aBajar.espacioId !== espacioId || cargando || error) return;
    operando.current = true;
    setOcupado(true);
    try {
      await fijasService.darDeBaja(aBajar.id);
      setABajar(null);
      setAviso('Reserva fija dada de baja.');
      await cargar();
    } catch (e) {
      setABajar(null);
      setAviso(e instanceof ApiError && e.codigo === 'SIN_PERMISO'
        ? 'Sólo el administrador puede dar de baja las reservas fijas.'
        : e instanceof Error ? e.message : 'No se pudo dar de baja la reserva fija.');
    } finally {
      setOcupado(false);
      operando.current = false;
    }
  };

  const hastaPorDefecto = useMemo(() => finDeMes(desde), [desde]);

  return <View style={styles.contenedor}>
    <View style={uiLayout.row}>
      <Text variant="subtitle" style={uiLayout.grow}>Fijas vigentes</Text>
      {editable && <Button size="sm" title="Nueva reserva fija" onPress={abrirNueva} />}
    </View>
    <SelectorCancha espacios={espacios} seleccionados={espacioId ? [espacioId] : []}
      onChange={ids => setEspacioId(ids[0] ?? '')} />

    {cargando && <ActivityIndicator color={colors.primary} />}
    {error && <Text selectable accessibilityRole="alert" tone="danger">{error}</Text>}
    {!cargando && !error && !fijas.length && <Text tone="muted">Esta cancha no tiene reservas fijas activas.</Text>}
    {fijas.map(fija => <View key={fija.id} style={[styles.fija, { borderColor: colors.border }]}>
      <View style={uiLayout.grow}>
        <Text variant="label">{fija.titular}</Text>
        <Text numeric variant="caption" tone="primary">{DIAS_SEMANA[fija.dia]} · {fija.inicio}–{fija.fin}</Text>
        <Text variant="caption" tone="muted">
          {fija.hasta ? `Del ${fechaLegible(fija.desde)} al ${fechaLegible(fija.hasta)}` : `Desde ${fechaLegible(fija.desde)}`}
        </Text>
      </View>
      {editable && <>
        <Button size="sm" variant="ghost" title="Editar" disabled={ocupado} onPress={() => editar(fija)} />
        <Button size="sm" variant="destructive" title="Dar de baja" disabled={ocupado} onPress={() => setABajar(fija)} />
      </>}
    </View>)}

    <HojaModal visible={hojaAbierta} titulo={editandoId ? 'Editar reserva fija' : 'Nueva reserva fija'}
      onCerrar={() => setHojaAbierta(false)}
      pie={<View style={uiLayout.row}>
        <Button variant="ghost" style={uiLayout.grow} title="Cancelar" disabled={ocupado} onPress={() => setHojaAbierta(false)} />
        <Button style={uiLayout.grow} title={editandoId ? 'Guardar cambios' : 'Crear reserva fija'}
          loading={ocupado} disabled={ocupado} onPress={() => void guardar()} />
      </View>}>
      <View style={styles.resumenCancha}>
        <Text variant="caption" tone="muted">Cancha</Text>
        <Text variant="label">{nombreDe(espacioId)}</Text>
      </View>

      <TextField label="Titular" value={titular} onChangeText={setTitular} placeholder="Grupo de los martes" />

      <View style={styles.bloque}>
        <Text variant="label" tone="muted">Día de la semana</Text>
        <View style={styles.chips}>
          {DIAS_SEMANA.map((nombre, indice) => <Chip key={nombre} selected={dia === indice}
            onPress={() => setDia(indice)}>{nombre}</Chip>)}
        </View>
      </View>

      <View style={styles.bloque}>
        <Text variant="label" tone="muted">Horario</Text>
        <SelectorFranjas inicio={inicio} fin={fin} onChange={(nuevoInicio, nuevoFin) => { setInicio(nuevoInicio); setFin(nuevoFin); }} />
      </View>

      <View style={styles.bloque}>
        <Text variant="label" tone="muted">Vigencia</Text>
        <CalendarioCancha valor={desde} onChange={setDesde} minimo={fechaArgentina()} />
        <View style={styles.chips}>
          <Chip selected={!hasta} onPress={() => setHasta(null)}>Sin fin</Chip>
          <Chip selected={hasta === hastaPorDefecto} disabled={!hastaPorDefecto}
            onPress={() => setHasta(hastaPorDefecto)}>Fin de mes</Chip>
        </View>
        {hasta && <CalendarioCancha valor={hasta} onChange={setHasta} minimo={desde} />}
      </View>

      <Surface variant="outlined" style={styles.resumen}>
        <Text variant="label">Resumen</Text>
        <Text variant="caption" tone="muted">
          {nombreDe(espacioId)} · {DIAS_SEMANA[dia]} {inicio ?? '--:--'}–{fin ?? '--:--'} ·{' '}
          {desde === hastaPorDefecto && !hasta ? 'desde el fin de mes' : `desde ${fechaLegible(desde)}`}
          {hasta ? ` hasta ${fechaLegible(hasta)}` : ''}
          {titular.trim() ? ` · ${titular.trim()}` : ''}
        </Text>
      </Surface>
    </HojaModal>

    {aBajar && <DialogoAviso titulo="Dar de baja reserva fija" mensaje="La serie dejará de ocupar esos horarios. Los demás bloqueos y reservas se conservan."
      detalle={`${aBajar.titular} · ${DIAS_SEMANA[aBajar.dia]} ${aBajar.inicio}-${aBajar.fin}`} destructivo
      accionPrincipal="Dar de baja" accionSecundaria="Volver" onConfirmar={darDeBaja} onCerrar={() => setABajar(null)} />}
    {aviso && <DialogoAviso titulo="Reservas fijas" mensaje={aviso} accionPrincipal="Entendido"
      onConfirmar={() => setAviso(null)} onCerrar={() => setAviso(null)} />}
  </View>;
}

const styles = StyleSheet.create({
  contenedor: { gap: spacing.md },
  fija: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: 1 },
  bloque: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  resumen: { gap: spacing.xs, padding: spacing.md },
  resumenCancha: { gap: spacing.xs },
});
