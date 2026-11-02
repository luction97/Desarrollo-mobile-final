import * as LocalAuthentication from 'expo-local-authentication';

export async function autenticarConBiometria(): Promise<boolean> {
  const tieneHardware = await LocalAuthentication.hasHardwareAsync();
  const estaEnrolado = await LocalAuthentication.isEnrolledAsync();

  if (!tieneHardware || !estaEnrolado) {
    return false; // El celular no tiene huella o no está configurada
  }

  const resultado = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Ingresá con tu huella para continuar',
    fallbackLabel: 'Usar contraseña',
  });

  return resultado.success;
}