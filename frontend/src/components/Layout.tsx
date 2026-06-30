import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import Icone from './Icones';
import Logo from './Logo';

export default function Layout() {
  const { user, logout, isPremium } = useAuth();
  const nav = useNavigate();
  const [menuAberto, setMenuAberto] = useState(false);

  async function sair() { await logout(); nav('/login'); }

  const cls = ({ isActive }: { isActive: boolean }) => (isActive ? 'ativo' : '');
  const fechar = () => setMenuAberto(false);
  const podeGerenciarEmpresa = ['admin_empresa', 'supervisor'].includes(user?.perfil || '');

  return (
    <div className="app">
      <aside className={'sidebar' + (menuAberto ? ' aberto' : '')} onClick={fechar}>
        <div className="logo"><Logo variant="light" size={30} /></div>
        {user?.perfil === 'admin_geral' ? (
          <>
            <NavLink to="/app/empresas" className={cls}><Icone nome="predio" size={18} /> Empresas</NavLink>
            <NavLink to="/app/usuarios" className={cls}><Icone nome="usuario" size={18} /> Usuários e permissões</NavLink>
          </>
        ) : (
          <>
            <NavLink to="/app" end className={cls}><Icone nome="grafico" size={18} /> Dashboard</NavLink>
            <NavLink to="/app/os" className={cls}><Icone nome="chave" size={18} /> Ordens de Serviço</NavLink>
            <NavLink to="/app/agenda" className={cls}><Icone nome="calendario" size={18} /> Agenda</NavLink>
            {podeGerenciarEmpresa && (
              <>
                <NavLink to="/app/relatorios" className={cls}><Icone nome="grafico" size={18} /> Relatórios</NavLink>
                <NavLink to="/app/cadastros" className={cls}><Icone nome="predio" size={18} /> Cadastros</NavLink>
                <NavLink to="/app/usuarios" className={cls}><Icone nome="usuario" size={18} /> Usuários e permissões</NavLink>
                {isPremium && (
                  <>
                    <NavLink to="/app/ativos" className={cls}><Icone nome="qr" size={18} /> Equipamentos</NavLink>
                    <NavLink to="/app/checklist" className={cls}><Icone nome="checklist" size={18} /> Checklist</NavLink>
                    <NavLink to="/app/estoque" className={cls}><Icone nome="caixa" size={18} /> Estoque</NavLink>
                  </>
                )}
                <NavLink to="/app/config" className={cls}><Icone nome="engrenagem" size={18} /> Configuração</NavLink>
              </>
            )}
          </>
        )}
      </aside>
      <div className={'overlay' + (menuAberto ? ' ativo' : '')} onClick={fechar} />

      <div className="conteudo">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="menu-btn" onClick={() => setMenuAberto(true)} aria-label="Abrir menu">☰</button>
            <strong>{isPremium ? 'Plano Premium' : 'Plano Simples'}</strong>
          </div>
          <div className="user-chip">
            <span className="nome-user">{user?.nome}</span>
            <span className="badge">{user?.perfil}</span>
            <button className="btn sec sm" onClick={sair}>Sair</button>
          </div>
        </header>
        <main className="main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
