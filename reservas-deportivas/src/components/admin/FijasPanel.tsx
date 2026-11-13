import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { Button, Chip, Surface, Text, TextField, uiLayout } from '../ui';
import { DialogoAviso } from '../DialogoAviso';
import { fijasService, type DatosFija } from '../../services/fijas';
import { DIAS_SEMANA } from '../../utils/horarios';
import { fechaLegible, finDeMes } from '../../utils/fechas';
import { spacing, useTheme } from '../../theme';
import type { ReservaFija } from '../../tipos';

interface FijasPanelProps {
  espacioId: string;
  /** Sólo el administrador crea, edita o da de baja fijas (M5 de la API). */
  editable: boolean;
}

interface Formulario { titular: string; dia: number; inicio: string; fin: string; desde: string; hasta: string }

const FORMULARIO_VACIO: Formulario = { titular: '', dia: 1, inicio: '', fin: '', desde: '', hasta: '' };

/**
 * Reservas fijas del espacio: lista con baja, alta y edición con las validaciones
 * del servidor reflejadas en mensajes (superposiciones y conflicto con reservas).
 */
export function FijasPanel({ espacioId, editable }: FijasPanelProps) {
  const { colors } = useTheme();
  const [fijas, setFijas] = useState<ReservaFija[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formulario, setFormulario] = useState<Formulario>(FORMULARIO_VACIO);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [aBajar, setABajar] = useState<ReservaFija | null>(null);
  const generacion = useRef(0);
  const operando = useRef(false);

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
    setEditandoId(null);
    setFormulario(FORMULARIO_VACIO);
    void cargar();
    return () => { generacion.current++; };
  }, [cargar]);

  const editar = (fija: ReservaFija) => {
    setEditandoId(fija.id);
    setFormulario({ titular: fija.titular, dia: fija.dia, inicio: fija.inicio, fin: fija.fin, desde: fija.desde, hasta: fija.hasta ?? '' });
  };

  const guardar = async () => {
    if (!editable || operando.current || !espacioId || cargando || error) return;
    if (editandoId && !fijas.some(fija => fija.id === editandoId && fija.espacioId === espacioId)) return;
    operando.current = true;
    setOcupado(true);
    const datos: DatosFija = {
      espacioId,
      titular: formulario.titular,
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
      setEditandoId(null);
      setFormulario(FORMULARIO_VACIO);
      await cargar();
    } catch (e) {
      setAviso(e instanceof Error ? e.message : 'No se pudo guardar la reserva fija.');
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
      setAviso(e instanceof Error ? e.message : 'No se pudo dar de baja la reserva fija.');
    } finally {
      setOcupado(false);
      operando.current = false;
    }
  };

  return <Surface style={uiLayout.section}>
    <Text variant="subtitle">Reservas fijas</Text>

    {cargando && <ActivityIndicator color={colors.primary} />}
    {error && <>
      <Text selectable accessibilityRole="alert" tone="danger">{error}</Text>
      <Button title="Reintentar" variant="secondary" onPress={cargar} />
    </>}
    {!cargando && !error && !fijas.length && <Text tone="muted">Sin reservas fijas activas en esta cancha.</Text>}
    {!cargando && !error && fijas.map(fija => <View key={fija.id} style={[uiLayout.fila, { borderColor: colors.border }]}>
      <View style={uiLayout.grow}>
        <Text variant="subtitle">{fija.titular}</Text>
        <Text numeric variant="label" tone="primary">{DIAS_SEMANA[fija.dia]} · {fija.inicio}–{fija.fin}</Text>
        <Text variant="label" tone="muted">Desde {fechaLegible(fija.desde)}{fija.hasta ? ` · hasta ${fechaLegible(fija.hasta)}` : ''}</Text>
      </View>
      {editable && <>
        <Button size="sm" variant="ghost" title="Editar" disabled={ocupado} onPress={() => editar(fija)} />
        <Button size="sm" variant="destructive" title="Dar de baja" disabled={ocupado} onPress={() => setABajar(fija)} />
      </>}
    </View>)}

    {editable && <>
      <Text variant="label" tone="muted">{editandoId ? `Editando ${fijas.find(f => f.id === editandoId)?.titular ?? ''}` : 'Nueva reserva fija'}</Text>
      <TextField label="Titular" value={formulario.titular} onChangeText={titular => setFormulario(f => ({ ...f, titular }))}
        editable={!ocupado} placeholder="Grupo de los martes" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
        {DIAS_SEMANA.map((nombre, dia) => <Chip key={nombre} selected={formulario.dia === dia} disabled={ocupado}
          onPress={() => setFormulario(f => ({ ...f, dia }))}>{nombre}</Chip>)}
      </ScrollView>
      <View style={uiLayout.row}>
        <View style={uiLayout.grow}>
          <TextField label="Hora inicio" value={formulario.inicio} onChangeText={inicio => setFormulario(f => ({ ...f, inicio }))}
            editable={!ocupado} keyboardType="numbers-and-punctuation" maxLength={5} placeholder="08:00" autoCapitalize="none" />
        </View>
        <View style={uiLayout.grow}>
          <TextField label="Hora fin" value={formulario.fin} onChangeText={fin => setFormulario(f => ({ ...f, fin }))}
            editable={!ocupado} keyboardType="numbers-and-punctuation" maxLength={5} placeholder="24:00" autoCapitalize="none" />
        </View>
      </View>
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
      <View style={uiLayout.row}>
        <Chip selected={formulario.hasta === finDeMes(formulario.desde)} disabled={ocupado || !finDeMes(formulario.desde)}
          accessibilityLabel="Ocupar todo el mes" onPress={() => setFormulario(f => ({ ...f, hasta: finDeMes(f.desde) ?? '' }))}>
          Todo el mes
        </Chip>
        <Text variant="caption" tone="muted">Ocupar el día y horario elegidos durante todo el mes.</Text>
      </View>
      <View style={uiLayout.row}>
        <Button title={editandoId ? 'Guardar cambios' : 'Crear reserva fija'} disabled={ocupado || cargando || !!error} loading={ocupado} onPress={() => void guardar()} />
        {editandoId && <Button variant="ghost" title="Cancelar edición" disabled={ocupado} onPress={() => { setEditandoId(null); setFormulario(FORMULARIO_VACIO); }} />}
      </View>
    </>}

    {aBajar && <DialogoAviso titulo="Dar de baja reserva fija" mensaje="La serie dejará de ocupar esos horarios. Los demás bloqueos y reservas se conservan."
      detalle={`${aBajar.titular} · ${DIAS_SEMANA[aBajar.dia]} ${aBajar.inicio}–${aBajar.fin}`} destructivo
      accionPrincipal="Dar de baja" accionSecundaria="Volver" onConfirmar={darDeBaja} onCerrar={() => setABajar(null)} />}
    {aviso && <DialogoAviso titulo="Reservas fijas" mensaje={aviso} accionPrincipal="Entendido"
      onConfirmar={() => setAviso(null)} onCerrar={() => setAviso(null)} />}
  </Surface>;
}
