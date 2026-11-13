import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Chip, Surface, Text, TextField, uiLayout } from '../ui';
import { DialogoAviso } from '../DialogoAviso';
import { SelectorCancha } from './SelectorCancha';
import { fijasService, type DatosFija } from '../../services/fijas';
import { ApiError } from '../../services/api';
import { DIAS_SEMANA, errorDeFecha, errorDeRangoHorario } from '../../utils/horarios';
import { diasDeReserva, fechaArgentina, fechaLegible, finDeMes } from '../../utils/fechas';
import { borders, layout, radius, spacing, useTheme } from '../../theme';
import type { Espacio, ReservaFija } from '../../tipos';

interface FijasPanelProps {
  espacios: Espacio[];
  /** El personal del complejo puede cargar y editar fijas; el servidor valida el rol (D6 de la API). */
  editable: boolean;
}

interface Formulario { titular: string; dia: number; inicio: string; fin: string; desde: string; hasta: string }

const FORMULARIO_VACIO: Formulario = { titular: '', dia: 1, inicio: '', fin: '', desde: '', hasta: '' };

/** Suma horas a una hora en punto ("20:00" + 2 = "22:00"). */
function sumarHoras(hora: string, horas: number): string {
  if (!/^\d{2}:\d{2}$/.test(hora)) return '';
  const total = Number(hora.slice(0, 2)) * 60 + Number(hora.slice(3, 5)) + horas * 60;
  if (total > 24 * 60) return '';
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * Reservas fijas de una cancha: lista de las series vigentes y alta o edición en
 * una hoja aparte, para que el formulario no ocupe toda la pantalla.
 */
export function FijasPanel({ espacios, editable }: FijasPanelProps) {
  const { colors } = useTheme();
  const [espacioId, setEspacioId] = useState(espacios[0]?.id ?? '');
  const [fijas, setFijas] = useState<ReservaFija[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formulario, setFormulario] = useState<Formulario>(FORMULARIO_VACIO);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [hojaAbierta, setHojaAbierta] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [aBajar, setABajar] = useState<ReservaFija | null>(null);
  const generacion = useRef(0);
  const operando = useRef(false);
  const dias = useMemo(() => diasDeReserva(fechaArgentina()), []);

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

  const abrirNueva = () => {
    setEditandoId(null);
    setFormulario({ ...FORMULARIO_VACIO, desde: dias[0]?.fecha ?? '' });
    setHojaAbierta(true);
  };

  const editar = (fija: ReservaFija) => {
    setEditandoId(fija.id);
    setFormulario({ titular: fija.titular, dia: fija.dia, inicio: fija.inicio, fin: fija.fin, desde: fija.desde, hasta: fija.hasta ?? '' });
    setHojaAbierta(true);
  };

  const guardar = async () => {
    if (!editable || operando.current || !espacioId || cargando || error) return;
    if (editandoId && !fijas.some(fija => fija.id === editandoId && fija.espacioId === espacioId)) return;
    const problemaFecha = errorDeFecha(formulario.desde.trim());
    if (problemaFecha) { setAviso(problemaFecha); return; }
    if (formulario.hasta.trim()) {
      const problemaHasta = errorDeFecha(formulario.hasta.trim());
      if (problemaHasta) { setAviso(problemaHasta); return; }
    }
    const problemaHoras = errorDeRangoHorario(formulario.inicio.trim() || null, formulario.fin.trim() || null);
    if (problemaHoras) { setAviso(problemaHoras); return; }
    if (!formulario.titular.trim()) { setAviso('Escribí el titular de la reserva.'); return; }
    operando.current = true;
    setOcupado(true);
    const datos: DatosFija = {
      espacioId,
      titular: formulario.titular.trim(),
      dia: formulario.dia as DatosFija['dia'],
      inicio: formulario.inicio.trim(),
      fin: formulario.fin.trim(),
      desde: formulario.desde.trim(),
      hasta: formulario.hasta.trim() || null,
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
      setFormulario(FORMULARIO_VACIO);
      setEditandoId(null);
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

  const aplicarDuracion = (horas: number) => setFormulario(f => ({ ...f, fin: sumarHoras(f.inicio, horas) }));

  return <Surface style={uiLayout.section}>
    <View style={uiLayout.row}>
      <Text variant="subtitle" style={uiLayout.grow}>Reservas fijas</Text>
      {editable && <Button size="sm" title="Nueva" onPress={abrirNueva} />}
    </View>
    <SelectorCancha espacios={espacios} seleccionado={espacioId} onSelect={setEspacioId} />

    {cargando && <ActivityIndicator color={colors.primary} />}
    {error && <>
      <Text selectable accessibilityRole="alert" tone="danger">{error}</Text>
      <Button title="Reintentar" variant="secondary" onPress={cargar} />
    </>}
    {!cargando && !error && !fijas.length && <Text tone="muted">Esta cancha no tiene reservas fijas activas.</Text>}
    {!cargando && !error && fijas.map(fija => <View key={fija.id} style={[uiLayout.fila, { borderColor: colors.border }]}>
      <View style={uiLayout.grow}>
        <Text variant="label">{fija.titular}</Text>
        <Text numeric variant="label" tone="primary">{DIAS_SEMANA[fija.dia]} · {fija.inicio}-{fija.fin}</Text>
        <Text variant="caption" tone="muted">
          {fija.hasta ? `Del ${fechaLegible(fija.desde)} al ${fechaLegible(fija.hasta)}` : `Desde ${fechaLegible(fija.desde)}`}
        </Text>
      </View>
      {editable && <>
        <Button size="sm" variant="ghost" title="Editar" disabled={ocupado} onPress={() => editar(fija)} />
        <Button size="sm" variant="destructive" title="Dar de baja" disabled={ocupado} onPress={() => setABajar(fija)} />
      </>}
    </View>)}

    <Modal visible={hojaAbierta} transparent animationType="slide" onRequestClose={() => setHojaAbierta(false)}>
      <View style={[styles.velo, { backgroundColor: colors.scrim }]}>
        <Surface style={styles.hoja} accessibilityViewIsModal>
          <View style={uiLayout.row}>
            <Text variant="title" accessibilityRole="header" style={uiLayout.grow}>
              {editandoId ? 'Editar reserva fija' : 'Nueva reserva fija'}
            </Text>
            <Button size="sm" variant="ghost" title="Cerrar" disabled={ocupado} onPress={() => setHojaAbierta(false)} />
          </View>
          <ScrollView contentContainerStyle={styles.opciones} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <TextField label="Titular" value={formulario.titular} onChangeText={titular => setFormulario(f => ({ ...f, titular }))}
              editable={!ocupado} placeholder="Grupo de los martes" />
            <Text variant="label" tone="muted">Día de la semana</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {DIAS_SEMANA.map((nombre, dia) => <Chip key={nombre} selected={formulario.dia === dia} disabled={ocupado}
                onPress={() => setFormulario(f => ({ ...f, dia }))}>{nombre}</Chip>)}
            </ScrollView>
            <View style={uiLayout.row}>
              <View style={uiLayout.grow}>
                <TextField label="Hora inicio" value={formulario.inicio} onChangeText={inicio => setFormulario(f => ({ ...f, inicio }))}
                  editable={!ocupado} keyboardType="numbers-and-punctuation" maxLength={5} placeholder="21:00" autoCapitalize="none" />
              </View>
              <View style={uiLayout.grow}>
                <TextField label="Hora fin" value={formulario.fin} onChangeText={fin => setFormulario(f => ({ ...f, fin }))}
                  editable={!ocupado} keyboardType="numbers-and-punctuation" maxLength={5} placeholder="22:00" autoCapitalize="none" />
              </View>
            </View>
            <View style={styles.chips}>
              <Chip selected={false} disabled={ocupado || !formulario.inicio} onPress={() => aplicarDuracion(1)}>1 hora</Chip>
              <Chip selected={false} disabled={ocupado || !formulario.inicio} onPress={() => aplicarDuracion(2)}>2 horas</Chip>
            </View>
            <Text variant="label" tone="muted">Vigencia</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {dias.map(d => <Chip key={d.fecha} selected={formulario.desde === d.fecha} disabled={ocupado}
                onPress={() => setFormulario(f => ({ ...f, desde: d.fecha }))}>{`${d.nombre} ${d.fecha.slice(-2)}`}</Chip>)}
            </ScrollView>
            <View style={uiLayout.row}>
              <View style={uiLayout.grow}>
                <TextField label="Desde (año-mes-día)" value={formulario.desde} onChangeText={desde => setFormulario(f => ({ ...f, desde }))}
                  editable={!ocupado} maxLength={10} placeholder="2026-03-01" />
              </View>
              <View style={uiLayout.grow}>
                <TextField label="Hasta (opcional)" value={formulario.hasta} onChangeText={hasta => setFormulario(f => ({ ...f, hasta }))}
                  editable={!ocupado} maxLength={10} placeholder="2026-12-31" />
              </View>
            </View>
            <View style={styles.chips}>
              <Chip selected={!!formulario.hasta && formulario.hasta === finDeMes(formulario.desde)} disabled={ocupado || !finDeMes(formulario.desde)}
                accessibilityLabel="Ocupar todo el mes" onPress={() => setFormulario(f => ({ ...f, hasta: finDeMes(f.desde) ?? '' }))}>
                Todo el mes
              </Chip>
              <Chip selected={!formulario.hasta} disabled={ocupado} accessibilityLabel="Sin fecha de fin"
                onPress={() => setFormulario(f => ({ ...f, hasta: '' }))}>
                Sin fin
              </Chip>
            </View>
          </ScrollView>
          <View style={uiLayout.row}>
            <Button variant="ghost" style={uiLayout.grow} title="Cancelar" disabled={ocupado} onPress={() => setHojaAbierta(false)} />
            <Button style={uiLayout.grow} title={editandoId ? 'Guardar cambios' : 'Crear reserva fija'}
              loading={ocupado} disabled={ocupado} onPress={() => void guardar()} />
          </View>
        </Surface>
      </View>
    </Modal>

    {aBajar && <DialogoAviso titulo="Dar de baja reserva fija" mensaje="La serie dejará de ocupar esos horarios. Los demás bloqueos y reservas se conservan."
      detalle={`${aBajar.titular} · ${DIAS_SEMANA[aBajar.dia]} ${aBajar.inicio}-${aBajar.fin}`} destructivo
      accionPrincipal="Dar de baja" accionSecundaria="Volver" onConfirmar={darDeBaja} onCerrar={() => setABajar(null)} />}
    {aviso && <DialogoAviso titulo="Reservas fijas" mensaje={aviso} accionPrincipal="Entendido"
      onConfirmar={() => setAviso(null)} onCerrar={() => setAviso(null)} />}
  </Surface>;
}

const styles = StyleSheet.create({
  velo: { flex: 1, justifyContent: 'flex-end' },
  hoja: {
    width: '100%', maxWidth: layout.formWidth, alignSelf: 'center',
    borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card,
    borderCurve: borders.curve, gap: spacing.md, paddingBottom: spacing.xl,
  },
  opciones: { gap: spacing.sm, paddingBottom: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
});
