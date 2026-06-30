import { ReactNode } from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';
import { Protegido, useAuth } from './lib/auth';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Cadastro from './pages/Cadastro';
import Privacidade from './pages/Privacidade';
import Termos from './pages/Termos';
import Solucoes from './pages/Solucoes';
import Dashboard from './pages/Dashboard';
import Unidades from './pages/Unidades';
import Cadastros from './pages/Cadastros';
import OSLista from './pages/OSLista';
import OSNova from './pages/OSNova';
import OSDetalhe from './pages/OSDetalhe';
import Agenda from './pages/Agenda';
import Relatorios from './pages/Relatorios';
import Empresas from './pages/Empresas';
import Ativos from './pages/Ativos';
import Checklist from './pages/Checklist';
import Estoque from './pages/Estoque';
import ConfigEmpresa from './pages/ConfigEmpresa';
import Usuarios from './pages/Usuarios';
import QRAtivo from './pages/QRAtivo';
import MobileApp from './pages/MobileApp';

function AppIndex() {
  const { user } = useAuth();
  if (user?.perfil === 'admin_geral') return <Navigate to="/app/empresas" replace />;
  return <Dashboard />;
}

function PremiumOnly({ children }: { children: ReactNode }) {
  const { isPremium } = useAuth();
  if (!isPremium) return <Navigate to="/app" replace />;
  return <>{children}</>;
}

function EmpresaAdminOnly({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!['admin_empresa', 'supervisor'].includes(user?.perfil || '')) return <Navigate to="/app" replace />;
  return <>{children}</>;
}

function UsuarioAdminOnly({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!['admin_empresa', 'supervisor', 'admin_geral'].includes(user?.perfil || '')) return <Navigate to="/app" replace />;
  return <>{children}</>;
}

function PremiumEmpresaAdminOnly({ children }: { children: ReactNode }) {
  return <PremiumOnly><EmpresaAdminOnly>{children}</EmpresaAdminOnly></PremiumOnly>;
}

export default function App() {
  return (
    <Routes>
      {/* públicas */}
      <Route path="/" element={<Landing />} />
      <Route path="/fluxo" element={<Landing initialSection="fluxo" />} />
      <Route path="/porque" element={<Landing initialSection="porque" />} />
      <Route path="/modulos" element={<Landing initialSection="modulos" />} />
      <Route path="/integracoes" element={<Landing initialSection="integracoes" />} />
      <Route path="/planos" element={<Landing initialSection="planos" />} />
      <Route path="/login" element={<Login />} />
      <Route path="/cadastro" element={<Cadastro />} />
      <Route path="/privacidade" element={<Privacidade />} />
      <Route path="/termos" element={<Termos />} />
      <Route path="/solucoes" element={<Solucoes />} />
      <Route path="/mobile" element={<MobileApp />} />

      {/* protegidas (dentro do layout com menu) */}
      <Route path="/app" element={<Protegido><Layout /></Protegido>}>
        <Route index element={<AppIndex />} />
        <Route path="empresas" element={<Empresas />} />
        <Route path="cadastros" element={<EmpresaAdminOnly><Cadastros /></EmpresaAdminOnly>} />
        <Route path="unidades" element={<EmpresaAdminOnly><Unidades /></EmpresaAdminOnly>} />
        <Route path="usuarios" element={<UsuarioAdminOnly><Usuarios /></UsuarioAdminOnly>} />
        <Route path="config" element={<EmpresaAdminOnly><ConfigEmpresa /></EmpresaAdminOnly>} />
        <Route path="ativos" element={<PremiumEmpresaAdminOnly><Ativos /></PremiumEmpresaAdminOnly>} />
        <Route path="checklist" element={<PremiumEmpresaAdminOnly><Checklist /></PremiumEmpresaAdminOnly>} />
        <Route path="estoque" element={<PremiumEmpresaAdminOnly><Estoque /></PremiumEmpresaAdminOnly>} />
        <Route path="os" element={<OSLista />} />
        <Route path="os/nova" element={<OSNova />} />
        <Route path="os/:id" element={<OSDetalhe />} />
        <Route path="agenda" element={<Agenda />} />
        <Route path="relatorios" element={<EmpresaAdminOnly><Relatorios /></EmpresaAdminOnly>} />
        <Route path="qr/:codigo" element={<PremiumOnly><QRAtivo /></PremiumOnly>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
