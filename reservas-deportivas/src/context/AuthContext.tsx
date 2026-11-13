import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { Usuario } from '../tipos';
import { authService } from '../services/auth';
import type { DatosRegistro } from '../services/auth';
import { autenticarConBiometria, biometriaDisponible } from '../services/biometria';
import {
  accesoBiometricoActivado,
  activarAccesoBiometrico,
  desactivarAccesoBiometrico,
  marcarOfertaBiometrica,
  ofertaBiometricaHecha,
} from '../services/accesoBiometrico';
import { escucharSesionInvalidada } from '../services/sesionEventos';
import { notificacionesService } from '../services/notificaciones';
import { prepararRecordatoriosGuardados } from '../services/reservas';
import { useSinRed } from '../hooks/useSinRed';
import { favoritosService } from '../services/favoritos';
import { AppState } from 'react-native';

interface AuthContextType {
  /** Usuario con sesión abierta. */
  usuario: Usuario | null;
  /** Usuario de la sesión guardada en el teléfono (para el reingreso). */
  usuarioGuardado: Usuario | null;
  /** El dispositivo admite huella o rostro. */
  tieneBiometria: boolean;
  /** Ese usuario activó el acceso biométrico. */
  accesoBiometrico: boolean;
  /** Hay una sesión guardada que espera la biometría para abrirse. */
  pideReingreso: boolean;
  /** Hay que ofrecer, una sola vez, activar el acceso biométrico. */
  ofreceBiometria: boolean;
  cargando: boolean;
  login: (email: string, contrasena: string) => Promise<void>;
  logout: () => Promise<void>;
  registro: (datos: DatosRegistro) => Promise<void>;
  /** Abre la sesión guardada con huella o rostro. */
  desbloquear: () => Promise<boolean>;
  activarAcceso: () => Promise<boolean>;
  desactivarAcceso: () => Promise<void>;
  resolverOferta: (activar: boolean) => Promise<void>;
  cambiarFavorito: (espacioId: string, agregar: boolean) => Promise<void>;
  conSelectorNativo: <T>(abrir: () => Promise<T>) => Promise<T>;
}

/**
 * Minutos que la app puede quedar en segundo plano antes de pedir la biometría
 * de nuevo. Así volver a la app (para la cámara, el dialer o el QR) no cierra la
 * sesión: sólo se bloquea si la app quedó mucho tiempo dormida.
 */
const MINUTOS_BLOQUEO = 5;

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [usuarioGuardado, setUsuarioGuardado] = useState<Usuario | null>(null);
  const [tieneBiometria, setTieneBiometria] = useState(false);
  const [accesoBiometrico, setAccesoBiometrico] = useState(false);
  const [pideReingreso, setPideReingreso] = useState(false);
  const [ofreceBiometria, setOfreceBiometria] = useState(false);
  const [cargando, setCargando] = useState(true);
  const sinRed = useSinRed();
  const perfilVersion = useRef(0);
  const sesionVersion = useRef(0);
  const perfilActual = useRef<Usuario | null>(null);
  const selectoresActivos = useRef(0);
  const enSegundoPlano = useRef<number | null>(null);
  const conSelectorNativo = async <T,>(abrir: () => Promise<T>) => {
    selectoresActivos.current++;
    try { return await abrir(); }
    finally { selectoresActivos.current--; }
  };
  const aplicarPerfil = (perfil: Usuario | null) => {
    perfilActual.current = perfil;
    setUsuario(perfil);
    setUsuarioGuardado(perfil);
  };
  const usuarioId = usuario?.id;

  useEffect(() => {
    if (!usuarioId || sinRed) return;
    let activo = true;
    // El teléfono queda anotado para recibir los avisos de suspensión del servidor.
    void notificacionesService.registrarDispositivo().catch(() => undefined);
    const refrescar = () => {
      const version = ++perfilVersion.current;
      void authService.obtenerPerfil().then(perfil => {
        if (!activo || version !== perfilVersion.current || perfil.id !== usuarioId) return;
        aplicarPerfil(perfil);
        return authService.actualizar(perfil);
      }).catch(() => undefined);
    };
    refrescar();
    const listener = AppState.addEventListener('change', estado => {
      if (estado === 'active') refrescar();
      else perfilVersion.current++;
    });
    return () => { activo = false; listener.remove(); };
  }, [usuarioId, sinRed]);

  useEffect(() => {
    let activo = true;
    (async () => {
      const [sesion, biometria] = await Promise.all([authService.restaurarSesion(), biometriaDisponible()]);
      if (!activo) return;
      setTieneBiometria(biometria);
      if (!sesion.usuario || !sesion.vigente) {
        // Sin sesión, o con el token vencido: se entra con credenciales.
        setUsuario(null);
        setUsuarioGuardado(null);
        setCargando(false);
        return;
      }
      setUsuarioGuardado(sesion.usuario);
      const activada = await accesoBiometricoActivado(sesion.usuario.id);
      if (!activo) return;
      setAccesoBiometrico(activada);
      if (biometria && activada) {
        // Sesión guardada con acceso biométrico: se pide la huella una vez al abrir.
        setPideReingreso(true);
        setUsuario(null);
      } else {
        setUsuario(sesion.usuario);
      }
      setCargando(false);
    })().catch(() => { if (activo) setCargando(false); });
    const dejarDeEscuchar = escucharSesionInvalidada(() => {
      perfilVersion.current++;
      sesionVersion.current++;
      aplicarPerfil(null);
      setAccesoBiometrico(false);
      setPideReingreso(false);
      void notificacionesService.cancelarTodos().catch(() => undefined);
    });
    return () => { activo = false; dejarDeEscuchar(); };
  }, []);

  useEffect(() => {
    // La sesión sobrevive al segundo plano: sólo se bloquea tras un rato largo
    // fuera de la app, para no exigir biometría en cada regreso.
    const listener = AppState.addEventListener('change', estado => {
      if (estado === 'background') { enSegundoPlano.current = Date.now(); return; }
      if (estado !== 'active') return;
      const desde = enSegundoPlano.current;
      enSegundoPlano.current = null;
      if (!desde || Date.now() - desde < MINUTOS_BLOQUEO * 60 * 1000) return;
      if (!tieneBiometria || selectoresActivos.current > 0 || !accesoBiometrico) return;
      perfilVersion.current++;
      sesionVersion.current++;
      perfilActual.current = null;
      setUsuario(null);
      setPideReingreso(true);
    });
    return () => listener.remove();
  }, [tieneBiometria, accesoBiometrico]);

  /** Ofrece el acceso biométrico una sola vez por usuario. */
  const prepararOferta = async (perfil: Usuario) => {
    if (!await biometriaDisponible()) return;
    if (await accesoBiometricoActivado(perfil.id)) return;
    if (await ofertaBiometricaHecha(perfil.id)) return;
    setOfreceBiometria(true);
  };

  const login = async (email: string, contrasena: string) => {
    const user = await authService.login(email, contrasena);
    sesionVersion.current++;
    aplicarPerfil(user);
    setPideReingreso(false);
    await prepararOferta(user);
  };

  const registro = async (datos: DatosRegistro) => {
    const user = await authService.registro(datos);
    sesionVersion.current++;
    aplicarPerfil(user);
    setPideReingreso(false);
    await prepararOferta(user);
  };

  /**
   * Abre la sesión guardada con biometría. La biometría no reemplaza la
   * validación de credenciales: sólo abre una sesión ya autenticada y vigente.
   */
  const desbloquear = async (): Promise<boolean> => {
    if (!usuarioGuardado) return false;
    const ok = await autenticarConBiometria();
    if (!ok) return false;
    const sesion = await authService.restaurarSesion();
    if (!sesion.vigente || !sesion.usuario) {
      aplicarPerfil(null);
      setPideReingreso(false);
      throw new Error('Tu sesión venció. Ingresá con tu contraseña.');
    }
    perfilVersion.current++;
    sesionVersion.current++;
    perfilActual.current = sesion.usuario;
    setUsuario(sesion.usuario);
    setUsuarioGuardado(sesion.usuario);
    setPideReingreso(false);
    return true;
  };

  const activarAcceso = async (): Promise<boolean> => {
    if (!usuario) return false;
    if (!await biometriaDisponible()) return false;
    if (!await autenticarConBiometria()) return false;
    await activarAccesoBiometrico(usuario.id);
    setAccesoBiometrico(true);
    return true;
  };

  const desactivarAcceso = async () => {
    if (!usuario) return;
    await desactivarAccesoBiometrico(usuario.id);
    setAccesoBiometrico(false);
  };

  const resolverOferta = async (activar: boolean) => {
    setOfreceBiometria(false);
    const actual = usuario;
    if (!actual) return;
    await marcarOfertaBiometrica(actual.id);
    if (!activar) return;
    await activarAcceso();
  };

  const cambiarFavorito = async (espacioId: string, agregar: boolean) => {
    if (!usuario || perfilActual.current?.id !== usuario.id) return;
    const version = sesionVersion.current;
    if (agregar) await favoritosService.agregar(espacioId);
    else await favoritosService.quitar(espacioId);
    const perfil = perfilActual.current;
    if (!perfil || version !== sesionVersion.current) return;
    perfilVersion.current++;
    const favoritos = new Set(perfil.espaciosFavoritos);
    if (agregar) favoritos.add(espacioId);
    else favoritos.delete(espacioId);
    const nuevo = { ...perfil, espaciosFavoritos: [...favoritos] };
    aplicarPerfil(nuevo);
    await authService.actualizar(nuevo).catch(() => undefined);
  };

  const logout = async () => {
    perfilVersion.current++;
    sesionVersion.current++;
    await authService.logout();
    aplicarPerfil(null);
    setAccesoBiometrico(false);
    setPideReingreso(false);
    setOfreceBiometria(false);
    await notificacionesService.cancelarTodos().catch(() => undefined);
  };

  return (
    <AuthContext.Provider value={{
      usuario, usuarioGuardado, tieneBiometria, accesoBiometrico, pideReingreso, ofreceBiometria, cargando,
      login, registro, logout, desbloquear, activarAcceso, desactivarAcceso, resolverOferta,
      cambiarFavorito, conSelectorNativo,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
