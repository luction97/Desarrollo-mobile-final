import { useRef } from 'react';
import { AccessibilityInfo, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';

interface DialogoAvisoProps {
  titulo: string;
  mensaje?: string;
  detalle?: string;
  accionPrincipal: string;
  accionSecundaria?: string;
  onConfirmar: () => void;
  onCerrar: () => void;
}

export function DialogoAviso({ titulo, mensaje, detalle, accionPrincipal, accionSecundaria, onConfirmar, onCerrar }: DialogoAvisoProps) {
  const principal = useRef<View>(null);
  const oscuro = useColorScheme() === 'dark';
  const colores = oscuro ? paleta.oscura : paleta.clara;

  return <Modal transparent visible accessibilityLabel={titulo} animationType="none" onRequestClose={onCerrar}
    onShow={() => {
      principal.current?.focus();
      if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility([titulo, mensaje, detalle].filter(Boolean).join('. '));
    }}>
    <View style={styles.fondo}>
      <View accessibilityViewIsModal style={[styles.dialogo, { backgroundColor: colores.fondo }]}>
        <ScrollView bounces={false} contentContainerStyle={styles.contenido}>
          <Text accessibilityRole="header" style={[styles.titulo, { color: colores.texto }]}>{titulo}</Text>
          {mensaje && <Text accessibilityLiveRegion="polite" style={[styles.mensaje, { color: colores.secundario }]}>{mensaje}</Text>}
          {detalle && <View style={[styles.detalle, { backgroundColor: colores.superficie }]}>
            <Text style={[styles.detalleTexto, { color: colores.texto }]}>{detalle}</Text>
          </View>}
          <View style={styles.acciones}>
            <Pressable ref={principal} accessibilityRole="button" onPress={onConfirmar}
              style={({ pressed }) => [styles.boton, { backgroundColor: colores.primario }, pressed && styles.presionado]}>
              <Text style={styles.principalTexto}>{accionPrincipal}</Text>
            </Pressable>
            {accionSecundaria && <Pressable accessibilityRole="button" onPress={onCerrar}
              style={({ pressed }) => [styles.boton, pressed && { backgroundColor: colores.superficie }]}>
              <Text style={[styles.secundarioTexto, { color: colores.texto }]}>{accionSecundaria}</Text>
            </Pressable>}
          </View>
        </ScrollView>
      </View>
    </View>
  </Modal>;
}

const paleta = {
  clara: { fondo: '#ffffff', superficie: '#f0f5f0', texto: '#17251b', secundario: '#4b5b50', primario: '#246b2c' },
  oscura: { fondo: '#19231d', superficie: '#25332a', texto: '#f1f6f2', secundario: '#c0cec4', primario: '#287333' },
};

const styles = StyleSheet.create({
  fondo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.48)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 40 },
  dialogo: { width: '100%', maxWidth: 420, maxHeight: '100%', borderRadius: 20, overflow: 'hidden' },
  contenido: { padding: 24 },
  titulo: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  mensaje: { fontSize: 16, lineHeight: 24 },
  detalle: { padding: 14, borderRadius: 10, marginTop: 20 },
  detalleTexto: { fontSize: 15, fontWeight: '600', lineHeight: 22 },
  acciones: { gap: 8, marginTop: 24 },
  boton: { minHeight: 48, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  principalTexto: { color: '#ffffff', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  secundarioTexto: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  presionado: { opacity: 0.8 },
});
