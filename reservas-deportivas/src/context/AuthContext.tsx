import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { Usuario } from '../tipos';
import { debeBloquearSesion } from '../utils/sesion';
import { authService } from '../services/auth';
import type { DatosRegistro } from '../services/auth';
import { autenticarConBiometria, biometriaDisponible } from '../services/biometria';
import { escucharSesionInvalidada } from '../services/sesionEventos';
import { notificacionesService } from '../services/notificaciones';
import { prepararRecordatoriosGuardados } from '../services/reservas';
import { useSinRed } from '../hooks/useSinRed';
import { favoritosService } from '../services/favoritos';
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
  cambiarFavorito: (espacioId: string, agregar: boolean) => Promise<void>;
  conSelectorNativo: <T>(abrir: () => Promise<T>) => Promise<T>;
}


const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [usuarioGuardado, setUsuarioGuardado] = useState<Usuario | null>(null);
  const [tieneBiometria, setTieneBiometria] = useState(false);
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
    Promise.all([authService.restaurarSesion(), biometriaDisponible()]).then(([user, biometria]) => {
      if (!activo) return;
      setTieneBiometria(biometria);
      setUsuarioGuardado(user);
      setUsuario(biometria ? null : user);
      perfilActual.current = biometria ? null : user;
      if (user) void prepararRecordatoriosGuardados(user.id).catch(() => undefined);
    }).catch(() => { if (activo) { setUsuario(null); setUsuarioGuardado(null); } })
      .finally(() => { if (activo) setCargando(false); });
    const dejarDeEscuchar = escucharSesionInvalidada(() => {
      perfilVersion.current++;
      sesionVersion.current++;
      aplicarPerfil(null);
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
      if (!debeBloquearSesion(desde, Date.now())) return;
      if (!tieneBiometria || selectoresActivos.current > 0) return;
      perfilVersion.current++;
      sesionVersion.current++;
      perfilActual.current = null;
      setUsuario(null);
    });
    return () => listener.remove();
  }, [tieneBiometria]);

  const login = async (email: string, contrasena: string) => {
    const user = await authService.login(email, contrasena);
    sesionVersion.current++;
    aplicarPerfil(user);
  };

  const registro = async (datos: DatosRegistro) => {
    const user = await authService.registro(datos);
    sesionVersion.current++;
    aplicarPerfil(user);
  };

  const desbloquear = async () => {
    if (!await autenticarConBiometria()) return false;
    const user = await authService.restaurarSesion();
    if (!user) throw new Error('La sesión venció. Ingresá con tu contraseña.');
    sesionVersion.current++;
    aplicarPerfil(user);
    return true;
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
    await notificacionesService.cancelarTodos().catch(() => undefined);
  };

  return (
    <AuthContext.Provider value={{ usuario, usuarioGuardado, tieneBiometria, cargando, login, registro, desbloquear, logout, cambiarFavorito, conSelectorNativo }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
