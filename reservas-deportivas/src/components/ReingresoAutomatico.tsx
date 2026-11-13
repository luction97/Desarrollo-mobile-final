import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * Inicia automáticamente la biometría al abrir la app, cuando hay una sesión
 * guardada con acceso biométrico activo. No exige tocar ningún botón.
 */
export function ReingresoAutomatico() {
  const { pideReingreso, desbloquear } = useAuth();
  const intentado = useRef(false);

  useEffect(() => {
    if (!pideReingreso) { intentado.current = false; return; }
    if (intentado.current) return;
    intentado.current = true;
    void desbloquear().catch(() => undefined);
  }, [pideReingreso, desbloquear]);

  return null;
}
