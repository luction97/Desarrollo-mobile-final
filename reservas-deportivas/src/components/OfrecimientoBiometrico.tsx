import { useState } from 'react';
import { DialogoAviso } from './DialogoAviso';
import { useAuth } from '../context/AuthContext';

/**
 * Ofrece, una sola vez por usuario, activar el acceso con huella o rostro.
 * La preferencia se guarda en el kv-store; la sesión sigue en el SecureStore.
 */
export function OfrecimientoBiometrico() {
  const { ofreceBiometria, resolverOferta } = useAuth();
  const [mensaje, setMensaje] = useState<string | null>(null);

  if (!ofreceBiometria) return mensaje ? (
    <DialogoAviso titulo="Acceso rápido" mensaje={mensaje} accionPrincipal="Entendido"
      onConfirmar={() => setMensaje(null)} onCerrar={() => setMensaje(null)} />
  ) : null;

  return <DialogoAviso titulo="¿Querés ingresar más rápido con tu huella o rostro?"
    mensaje="La próxima vez vas a poder entrar sin escribir tu contraseña."
    detalle="Podés activarlo o desactivarlo cuando quieras desde Cuenta."
    accionPrincipal="Activar" accionSecundaria="Ahora no"
    onConfirmar={() => { void resolverOferta(true); setMensaje('Listo. La próxima vez entrás con tu huella o tu rostro.'); }}
    onCerrar={() => { void resolverOferta(false); }} />;
}
