import * as LocalAuthentication from 'expo-local-authentication';
import { Platform, Alert } from 'react-native';

// El acceso operativo no usa la simulación web del login.
export async function autenticarPersonal(): Promise<boolean> {
  if (Platform.OS === 'web') {
    throw new Error('El escaneo requiere un dispositivo móvil con biometría configurada.');
  }
  const disponible = await LocalAuthentication.hasHardwareAsync();
  const enrolado = disponible && await LocalAuthentication.isEnrolledAsync();
  if (!enrolado) {
    throw new Error('Configurá huella o rostro en el dispositivo para habilitar el escáner. Face ID requiere un development build en iOS.');
  }
  const resultado = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Confirmá tu identidad para registrar ingresos',
    cancelLabel: 'Cancelar',
    fallbackLabel: '',
    disableDeviceFallback: true,
  });
  return resultado.success;
}

export async function autenticarConBiometria(): Promise<boolean> {
  // Web no expone LocalAuthentication: solicita confirmación explícita del usuario.
  if (Platform.OS === 'web') {
    const confirmar = window.confirm('🔒 [Simulación Web] ¿Confirmás tu identidad con tu huella?');
    return confirmar;
  }

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
