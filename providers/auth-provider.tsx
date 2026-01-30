"use client";

/**
 * AuthProvider
 * - Centraliza estado de autenticação
 * - Carrega token do localStorage
 * - (NOVO) Carrega user do localStorage para evitar flash e permitir RoleGuard imediato
 * - Expõe isReady para evitar flash de conteúdo
 *
 * Decisão:
 * - Salvamos `user` também no storage para reidratar rápido após refresh.
 * - No futuro, podemos validar o token chamando /users/me (mais robusto).
 */

import { createContext, useContext, useEffect, useState } from "react";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "ORGANIZER" | "FINANCE" | string; // mantenha flexível por enquanto
};

type AuthContextData = {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isReady: boolean;
  login: (payload: { token: string; user: AuthUser }) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextData | null>(null);

const TOKEN_KEY = "access_token";
const USER_KEY = "auth_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Reidrata token + user para manter a sessão após refresh
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY);

    if (storedToken) setToken(storedToken);

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        // Se corromper, limpamos para não quebrar o app
        localStorage.removeItem(USER_KEY);
        setUser(null);
      }
    }

    setIsReady(true);
  }, []);

  function login(payload: { token: string; user: AuthUser }) {
    localStorage.setItem(TOKEN_KEY, payload.token);
    localStorage.setItem(USER_KEY, JSON.stringify(payload.user));

    setToken(payload.token);
    setUser(payload.user);
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);

    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated: !!token,
        isReady,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
