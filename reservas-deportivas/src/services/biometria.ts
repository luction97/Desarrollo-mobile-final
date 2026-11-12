import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

// El acceso operativo no usa la simulación web del login.
export async function autenticarPersonal(): Promise<boolean> {
  if (Platform.OS === 'web') {
    throw new Error('Usá un dispositivo móvil para leer el QR. Podés confirmar tu identidad con tu contraseña.');
  }
  const disponible = await LocalAuthentication.hasHardwareAsync();
  const enrolado = disponible && await LocalAuthentication.isEnrolledAsync();
  if (!enrolado) {
    throw new Error('Configurá huella o rostro en el teléfono, o elegí Usar contraseña.');
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
  if (Platform.OS === 'web') return false;

  const tieneHardware = await LocalAuthentication.hasHardwareAsync();
  const estaEnrolado = await LocalAuthentication.isEnrolledAsync();

  if (!tieneHardware || !estaEnrolado) {
    return false;
  }

  const resultado = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Ingresá con tu huella para continuar',
    cancelLabel: 'Usar contraseña',
    disableDeviceFallback: true,
  });

  return resultado.success;
}

export async function biometriaDisponible(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  return await LocalAuthentication.hasHardwareAsync() && await LocalAuthentication.isEnrolledAsync();
}
