import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { Usuario } from '../tipos';
import { authService } from '../services/auth';
import type { DatosRegistro } from '../services/auth';
import { autenticarConBiometria, biometriaDisponible } from '../services/biometria';
import { escucharSesionInvalidada } from '../services/sesionEventos';
import { notificacionesService } from '../services/notificaciones';
import { prepararRecordatoriosGuardados } from '../services/reservas';
import { useSinRed } from '../hooks/useSinRed';
import { AppState } from 'react-native';

interface AuthContextType {
  usuario: Usuario | null;
  usuarioGuardado: Usuario | null;
  tieneBiometria: boolean;
  cargando: boolean;
  login: (email: string, contrasena: string) => Promise<void>;
  logout: () => Promise<void>;
  registro: (datos: DatosRegistro) => Promise<void>;
  desbloquear: () => Promise<boolean>;
  actualizarUsuario: (usuario: Usuario) => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [usuarioGuardado, setUsuarioGuardado] = useState<Usuario | null>(null);
  const [tieneBiometria, setTieneBiometria] = useState(false);
  const [cargando, setCargando] = useState(true);
  const sinRed = useSinRed();
  const perfilVersion = useRef(0);
  const usuarioId = usuario?.id;
  useEffect(() => {
    if (!usuarioId || sinRed) return;
    let activo = true;
    const refrescar = () => {
      const version = ++perfilVersion.current;
      void authService.obtenerPerfil().then(perfil => {
        if (!activo || version !== perfilVersion.current || perfil.id !== usuarioId) return;
        setUsuario(perfil);
        setUsuarioGuardado(perfil);
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
    Promise.all([authService.restaurarSesion(), biometriaDisponible()]).then(([user, biometria]) => {
      if (!activo) return;
      setTieneBiometria(biometria);
      setUsuarioGuardado(user);
      setUsuario(biometria ? null : user);
      if (user) void prepararRecordatoriosGuardados(user.id).catch(() => undefined);
    }).catch(() => { if (activo) { setUsuario(null); setUsuarioGuardado(null); } })
      .finally(() => { if (activo) setCargando(false); });
    const dejarDeEscuchar = escucharSesionInvalidada(() => {
      perfilVersion.current++;
      setUsuario(null);
      setUsuarioGuardado(null);
      void notificacionesService.cancelarTodos().catch(() => undefined);
    });
    return () => { activo = false; dejarDeEscuchar(); };
  }, []);

  useEffect(() => {
    const listener = AppState.addEventListener('change', estado => {
      if (estado === 'background' && tieneBiometria) setUsuario(null);
    });
    return () => listener.remove();
  }, [tieneBiometria]);

  const login = async (email: string, contrasena: string) => {
    const user = await authService.login(email, contrasena);
    setUsuario(user);
    setUsuarioGuardado(user);
  };

  const registro = async (datos: DatosRegistro) => {
    const user = await authService.registro(datos);
    setUsuario(user); setUsuarioGuardado(user);
  };

  const desbloquear = async () => {
    if (!await autenticarConBiometria()) return false;
    const user = await authService.restaurarSesion();
    if (!user) throw new Error('La sesión venció. Ingresá con tu contraseña.');
    setUsuario(user); setUsuarioGuardado(user);
    return true;
  };

  const actualizarUsuario = (nuevo: Usuario) => {
    perfilVersion.current++;
    setUsuario(nuevo);
    setUsuarioGuardado(nuevo);
    authService.actualizar(nuevo).catch(() => undefined);
  };

  const logout = async () => {
    perfilVersion.current++;
    await authService.logout();
    setUsuario(null);
    setUsuarioGuardado(null);
    await notificacionesService.cancelarTodos().catch(() => undefined);
  };

  return (
    <AuthContext.Provider value={{ usuario, usuarioGuardado, tieneBiometria, cargando, login, registro, desbloquear, logout, actualizarUsuario }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
