import React, { createContext, useState, useEffect, useContext } from 'react';
import { Usuario } from '../tipos';
import { authService } from '../services/auth';

interface AuthContextType {
  usuario: Usuario | null;
  cargando: boolean;
  login: (email: string, contrasena: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    authService.obtenerUsuarioGuardado().then((user) => {
      setUsuario(user);
      setCargando(false);
    });
  }, []);

  const login = async (email: string, contrasena: string) => {
    const user = await authService.login(email, contrasena);
    setUsuario(user);
  };

  const logout = async () => {
    await authService.logout();
    setUsuario(null);
  };

  return (
    <AuthContext.Provider value={{ usuario, cargando, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);