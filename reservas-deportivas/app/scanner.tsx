import { useState } from 'react';
import { View, Text, StyleSheet, Button, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { api } from '../src/services/api';

export default function EscanerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [escaneado, setEscaneado] = useState(false);
  const router = useRouter();

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: 'center', marginBottom: 20 }}>
          Necesitamos permiso para usar la cámara y escanear los QRs.
        </Text>
        <Button onPress={requestPermission} title="Dar permiso" />
      </View>
    );
  }

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    // Evitamos que escanee múltiples veces el mismo código en milisegundos
    if (escaneado) return;
    setEscaneado(true);

    // 1. Vibración de "éxito" al leer un código
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    console.log("Código QR escaneado:", data);

    try {
      // 2. Enviamos el código a la API
      // (Ajustá el body según lo que pida tu Swagger en POST /ingresos, 
      // probablemente pida el codigoQr)
      const respuesta = await api.post('/ingresos', { codigoQr: data });
      
      Alert.alert('¡Ingreso Válido! ✅', 'El turno fue registrado correctamente.');
      router.back(); // Volvemos a la pantalla anterior
    } catch (error: any) {
      // 3. Vibración de "error" si el código es falso o de otro día
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error de Ingreso ❌', error.message || 'El código no es válido.');
      
      // Damos 2 segundos de pausa para volver a intentar
      setTimeout(() => setEscaneado(false), 2000);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={escaneado ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
      />
      
      {/* Marco visual para que Marcelo sepa dónde apuntar */}
      <View style={styles.overlay}>
        <View style={styles.scanBox} />
        <Text style={styles.scanText}>
          Apuntá al código QR de la reserva
        </Text>
        {escaneado && <Text style={{color: 'white', marginTop: 20}}>Procesando...</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center' },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  scanBox: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#2E7D32',
    backgroundColor: 'transparent',
    borderRadius: 20,
  },
  scanText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 20,
    textAlign: 'center',
  },
});