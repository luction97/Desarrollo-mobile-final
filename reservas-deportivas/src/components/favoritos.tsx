import { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import * as Haptics from 'expo-haptics';
import * as Network from 'expo-network';
import { DialogoAviso } from './DialogoAviso';
import { useAuth } from '../context/AuthContext';
import { interaction, spacing, useTheme } from '../theme';

interface AvisoFavorito { titulo: string; mensaje?: string }

interface FavoritoToggleProps {
  espacioId: string;
  /** Nombre del espacio, para el rótulo accesible. */
  nombre?: string;
}

/**
 * Corazón que agrega o quita el espacio de los favoritos del usuario en sesión.
 * Al quitar espera la confirmación para que el filtro de favoritos no oculte errores.
 */
export function FavoritoToggle({ espacioId, nombre }: FavoritoToggleProps) {
  const { colors } = useTheme();
  const { usuario, cambiarFavorito } = useAuth();
  const [aviso, setAviso] = useState<AvisoFavorito | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const operando = useRef(false);
  const favorito = usuario?.espaciosFavoritos.includes(espacioId) ?? false;

  const alternar = async () => {
    if (operando.current) return;
    if (!usuario) {
      setAviso({ titulo: 'Ingresá para marcar favoritos' });
      return;
    }
    operando.current = true;
    setOcupado(true);
    try {
      const red = await Network.getNetworkStateAsync();
      if (red.isConnected === false || red.isInternetReachable === false) throw new Error('Conectate para actualizar tus favoritos.');
      await cambiarFavorito(espacioId, !favorito);
      if (!favorito) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    } catch (e) {
      setAviso({
        titulo: 'No se pudo actualizar el favorito',
        mensaje: e instanceof Error ? e.message : 'Probá de nuevo.',
      });
    } finally {
      operando.current = false;
      setOcupado(false);
    }
  };

  return <View>
    <Pressable accessibilityRole="button" onPress={() => alternar()} disabled={ocupado}
      accessibilityLabel={favorito ? `Quitar ${nombre ?? 'esta cancha'} de favoritos` : `Agregar ${nombre ?? 'esta cancha'} a favoritos`}
      accessibilityState={{ disabled: ocupado, selected: favorito, busy: ocupado }}
      style={({ pressed }) => [styles.boton, { opacity: pressed || ocupado ? interaction.pressedOpacity : 1 }]}>
      <Ionicons name={favorito ? 'heart' : 'heart-outline'} size={spacing.xxl}
        color={favorito ? colors.danger : colors.muted} />
    </Pressable>
    {aviso && <DialogoAviso titulo={aviso.titulo} mensaje={aviso.mensaje} accionPrincipal="Entendido"
      onConfirmar={() => setAviso(null)} onCerrar={() => setAviso(null)} />}
  </View>;
}

const styles = StyleSheet.create({
  boton: {
    minWidth: 48,
    minHeight: 48,
    padding: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
