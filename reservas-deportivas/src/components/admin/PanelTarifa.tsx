import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Surface, Text, TextField, uiLayout } from '../ui';
import { SelectorCancha } from './SelectorCancha';
import { operacionesService } from '../../services/operaciones';
import { guardarEspacioActualizado } from '../../services/espacios';
import { ApiError } from '../../services/api';
import { precioLegible } from '../../utils/dinero';
import { spacing } from '../../theme';
import type { Espacio } from '../../tipos';

interface PanelTarifaProps {
  espacios: Espacio[];
  /** El personal ve el control; el servidor define si puede aplicarlo (D6 de la API). */
  puedeCambiar: boolean;
}

/** Cambio de tarifa por hora de un espacio, con el selector de cancha arriba. */
export function PanelTarifa({ espacios, puedeCambiar }: PanelTarifaProps) {
  const [espacioId, setEspacioId] = useState(espacios[0]?.id ?? '');
  const [precio, setPrecio] = useState('');
  const [cambiando, setCambiando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const espacio = espacios.find(e => e.id === espacioId) ?? espacios[0] ?? null;

  const cambiarPrecio = async () => {
    if (!espacio || cambiando || !puedeCambiar) return;
    if (!precio.trim() || !Number.isInteger(Number(precio)) || Number(precio) <= 0) {
      setMensaje('Ingresá un precio entero, mayor que cero.'); return;
    }
    setCambiando(true);
    try {
      const actualizado = await operacionesService.cambiarPrecio(espacio.id, Number(precio));
      await guardarEspacioActualizado(actualizado).catch(() => undefined);
      setPrecio('');
      setMensaje('Precio actualizado.');
    } catch (e) {
      setMensaje(e instanceof ApiError && e.codigo === 'SIN_PERMISO'
        ? 'Sólo el administrador puede cambiar el precio por hora.'
        : e instanceof Error ? e.message : 'No se pudo cambiar el precio.');
    } finally {
      setCambiando(false);
    }
  };

  return <Surface style={uiLayout.section}>
    <Text variant="subtitle">Cambiar precio por hora</Text>
    <SelectorCancha espacios={espacios} seleccionado={espacio?.id ?? ''} onSelect={setEspacioId} />
    {espacio && <>
      <Text numeric variant="title" tone="primary">{precioLegible(espacio.precioPorHora)} por hora</Text>
      <TextField label="Nuevo precio" keyboardType="number-pad" value={precio} onChangeText={setPrecio}
        editable={!cambiando} placeholder="12000" />
      <Button title="Actualizar precio" onPress={() => void cambiarPrecio()} loading={cambiando} disabled={cambiando} />
    </>}
    {mensaje && <Text accessibilityLiveRegion="polite" tone="muted">{mensaje}</Text>}
  </Surface>;
}
