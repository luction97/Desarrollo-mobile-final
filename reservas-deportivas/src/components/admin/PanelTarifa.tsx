import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Surface, Text, TextField, uiLayout } from '../ui';
import { DialogoAviso } from '../DialogoAviso';
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

/** Cambio de tarifa por hora de un espacio, con el precio actual a la vista. */
export function PanelTarifa({ espacios, puedeCambiar }: PanelTarifaProps) {
  const [espacioId, setEspacioId] = useState(espacios[0]?.id ?? '');
  const [precio, setPrecio] = useState('');
  const [cambiando, setCambiando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const espacio = espacios.find(e => e.id === espacioId) ?? espacios[0] ?? null;

  useEffect(() => { setPrecio(''); }, [espacioId]);

  const importe = Number(precio);
  const valido = precio.trim() !== '' && Number.isInteger(importe) && importe > 0;
  const hayCambio = valido && espacio !== null && importe !== espacio.precioPorHora;

  const cambiarPrecio = async () => {
    if (!espacio || !hayCambio || cambiando) return;
    setCambiando(true);
    try {
      const actualizado = await operacionesService.cambiarPrecio(espacio.id, importe);
      await guardarEspacioActualizado(actualizado).catch(() => undefined);
      setPrecio('');
      setAviso('Precio actualizado.');
    } catch (e) {
      setAviso(e instanceof ApiError && e.codigo === 'SIN_PERMISO'
        ? 'Sólo el administrador puede cambiar el precio por hora.'
        : e instanceof Error ? e.message : 'No se pudo cambiar el precio.');
    } finally {
      setCambiando(false);
    }
  };

  return <View style={styles.contenedor}>
    <SelectorCancha espacios={espacios} seleccionados={espacioId ? [espacioId] : []}
      onChange={ids => setEspacioId(ids[0] ?? '')} />
    {espacio && <>
      <Surface variant="outlined" style={styles.actual}>
        <Text variant="caption" tone="muted">Tarifa vigente</Text>
        <Text numeric variant="title" tone="primary">{precioLegible(espacio.precioPorHora)} por hora</Text>
      </Surface>
      <TextField label="Nuevo precio por hora" value={precio} onChangeText={setPrecio}
        keyboardType="number-pad" placeholder={String(espacio.precioPorHora)} editable={!cambiando} />
      <Button title="Guardar precio" onPress={() => void cambiarPrecio()} loading={cambiando}
        disabled={!hayCambio || cambiando} />
    </>}
    {aviso && <DialogoAviso titulo="Tarifa" mensaje={aviso} accionPrincipal="Entendido"
      onConfirmar={() => setAviso(null)} onCerrar={() => setAviso(null)} />}
  </View>;
}

const styles = StyleSheet.create({
  contenedor: { gap: spacing.md },
  actual: { gap: spacing.xs, padding: spacing.md },
});
