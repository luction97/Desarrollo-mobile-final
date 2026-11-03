import * as LocalAuthentication from 'expo-local-authentication';
import { Platform, Alert } from 'react-native';

export async function autenticarConBiometria(): Promise<boolean> {
  // En la WEB simulamos que la huella es exitosa (para que puedan probar)
  if (Platform.OS === 'web') {
    const confirmar = window.confirm('🔒 [Simulación Web] ¿Confirmás tu identidad con tu huella?');
    return confirmar;
  }

  // EN EL CELULAR: Usamos el sensor real
  const tieneHardware = await LocalAuthentication.hasHardwareAsync();
  const estaEnrolado = await LocalAuthentication.isEnrolledAsync();

  if (!tieneHardware || !estaEnrolado) {
    Alert.alert('No disponible', 'Tu dispositivo no tiene huella o rostro configurado.');
    return false;
  }

  const resultado = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Ingresá con tu huella para continuar',
    fallbackLabel: 'Usar contraseña',
  });

  return resultado.success;
}