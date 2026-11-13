import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Platform, StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Button, StateView, Surface, Text, uiLayout } from './ui';
import { spacing, useTheme } from '../theme';

/** Duración máxima del video de la cancha, como pide el cliente (20 a 30 segundos). */
export const DURACION_MAXIMA_VIDEO = 30;

interface GrabarVideoCanchaProps {
  visible: boolean;
  onCerrar: () => void;
  /** Recibe el video grabado para que la pantalla lo suba y lo muestre. */
  onGrabar: (uri: string) => Promise<void>;
}

/**
 * Grabación del video de la cancha con la cámara del teléfono, limitado a 30
 * segundos. Pide permiso sólo al abrir el grabador, nunca al entrar a la ficha.
 */
export function GrabarVideoCancha({ visible, onCerrar, onGrabar }: GrabarVideoCanchaProps) {
  const { colors } = useTheme();
  const [permiso, pedirPermiso] = useCameraPermissions();
  const camara = useRef<CameraView>(null);
  const [grabando, setGrabando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) { setGrabando(false); setSegundos(0); setError(null); setProcesando(false); }
  }, [visible]);

  useEffect(() => {
    if (!grabando) return;
    const reloj = setInterval(() => setSegundos(actual => actual + 1), 1000);
    return () => clearInterval(reloj);
  }, [grabando]);

  const iniciar = useCallback(async () => {
    if (grabando || procesando) return;
    setError(null);
    setSegundos(0);
    setGrabando(true);
    try {
      const video = await camara.current?.recordAsync({ maxDuration: DURACION_MAXIMA_VIDEO });
      setGrabando(false);
      if (!video?.uri) return;
      setProcesando(true);
      await onGrabar(video.uri);
      onCerrar();
    } catch (e) {
      setGrabando(false);
      setError(e instanceof Error ? e.message : 'No se pudo grabar el video.');
    } finally {
      setProcesando(false);
    }
  }, [grabando, procesando, onGrabar, onCerrar]);

  const detener = useCallback(() => { camara.current?.stopRecording(); }, []);

  const sinPermiso = permiso?.granted === false;
  const soportado = Platform.OS !== 'web';

  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onCerrar}>
    <View style={[styles.velo, { backgroundColor: colors.scrim }]}>
      <Surface style={styles.hoja} accessibilityViewIsModal>
        <View style={uiLayout.row}>
          <Text variant="title" accessibilityRole="header" style={uiLayout.grow}>Grabar video de la cancha</Text>
          <Button size="sm" variant="ghost" title="Cerrar" disabled={grabando || procesando} onPress={onCerrar} />
        </View>
        {!soportado ? <Text tone="muted">La grabación de video se hace desde el teléfono: abrí la app en Android o iPhone.</Text>
          : sinPermiso ? <StateView>
            <Text tone="muted" accessibilityRole="alert">Necesitamos la cámara para grabar el video de la cancha.</Text>
            <Button title="Permitir cámara" onPress={() => void pedirPermiso()} />
          </StateView>
          : <View style={styles.camara}>
            <CameraView ref={camara} style={styles.previa} mode="video" facing="back" />
            <Text variant="label" tone="primary" accessibilityLiveRegion="polite">
              {grabando ? `Grabando · ${segundos} s de ${DURACION_MAXIMA_VIDEO}` : `Máximo ${DURACION_MAXIMA_VIDEO} segundos`}
            </Text>
          </View>}
        {error && <Text selectable tone="danger" accessibilityRole="alert">{error}</Text>}
        {soportado && !sinPermiso && <View style={uiLayout.row}>
          {grabando
            ? <Button variant="secondary" style={uiLayout.grow} title="Detener" onPress={detener} />
            : <Button style={uiLayout.grow} title="Grabar" loading={procesando} disabled={procesando} onPress={() => void iniciar()} />}
        </View>}
      </Surface>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  velo: { flex: 1, justifyContent: 'flex-end' },
  hoja: { width: '100%', gap: spacing.md, paddingBottom: spacing.xl },
  camara: { gap: spacing.sm },
  previa: { width: '100%', aspectRatio: 16 / 9, borderRadius: 12, overflow: 'hidden' },
});
