import { createContext, useContext, useState, ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { api, setSession, clearSession, getUser, getToken, Usuario } from './api';

export interface CadastroDados {
  empresa_nome: string;
  plano: string;
  admin_nome: string;
  admin_email: string;
  admin_senha: string;
  whatsapp?: string;
  documento?: string;
  website?: string;
}

interface AuthValue {
  user: Usuario | null;
  login: (email: string, senha: string) => Promise<Usuario>;
  cadastrar: (dados: CadastroDados) => Promise<void>;
  logout: () => Promise<void>;
  isPremium: boolean;
}

const AuthCtx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(getUser());

  async function login(email: string, senha: string): Promise<Usuario> {
    const data = await api<{ token: string; usuario: Usuario }>('/login.php', { method: 'POST', body: { email, senha } });
    setSession(data.token, data.usuario);
    setUser(data.usuario);
    return data.usuario;
  }

  // Cadastro com aprovação: cria a conta como "pendente". NÃO faz login (sem token).
  async function cadastrar(dados: CadastroDados): Promise<void> {
    await api('/empresas/cadastro_publico.php', { method: 'POST', body: dados });
  }

  async function logout(): Promise<void> {
    try { await api('/logout.php', { method: 'POST' }); } catch { /* ignora */ }
    clearSession();
    setUser(null);
  }

  const isPremium = user?.plano === 'premium';
  return <AuthCtx.Provider value={{ user, login, cadastrar, logout, isPremium }}>{children}</AuthCtx.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>');
  return ctx;
}

export function Protegido({ children }: { children: ReactNode }) {
  if (!getToken()) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
