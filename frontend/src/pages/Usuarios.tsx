import { FormEvent, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

interface UsuarioLinha {
  id: number;
  nome: string;
  email: string;
  telefone: string | null;
  whatsapp: string | null;
  perfil: string;
  status: string;
}

interface Empresa {
  id: number;
  nome: string;
  status: string;
  db_nome: string | null;
}

const PERFIS: Record<string, string> = {
  admin_empresa: 'Gestor da empresa',
  supervisor: 'Supervisor',
  tecnico: 'Técnico',
  solicitante: 'Solicitante',
};

function erro(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function perfilLabel(perfil: string): string {
  return PERFIS[perfil] || perfil;
}

export default function Usuarios() {
  const { user } = useAuth();
  const isAdminGeral = user?.perfil === 'admin_geral';
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [empresaId, setEmpresaId] = useState('');
  const [lista, setLista] = useState<UsuarioLinha[]>([]);
  const [form, setForm] = useState<Partial<UsuarioLinha> & { senha?: string }>({ perfil: 'solicitante', status: 'ativo' });
  const [erroMsg, setErroMsg] = useState('');
  const [msg, setMsg] = useState('');
  const editando = Boolean(form.id);

  const empresaQuery = isAdminGeral ? '?empresa_id=' + empresaId : '';
  const empresaBody = isAdminGeral ? { empresa_id: Number(empresaId) } : {};
  const podeCarregar = !isAdminGeral || Boolean(empresaId);

  async function carregarEmpresas() {
    if (!isAdminGeral) return;
    const dados = await api<Empresa[]>('/empresas/empresas.php');
    setEmpresas(dados);
    if (!empresaId && dados.length) setEmpresaId(String(dados[0].id));
  }

  async function carregar() {
    setErroMsg('');
    if (!podeCarregar) {
      setLista([]);
      return;
    }
    setLista(await api<UsuarioLinha[]>('/usuarios/usuarios.php' + empresaQuery));
  }

  useEffect(() => {
    carregarEmpresas().catch((e) => setErroMsg(erro(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdminGeral]);

  useEffect(() => {
    carregar().catch((e) => setErroMsg(erro(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId, isAdminGeral]);

  function limparForm() {
    setForm({ perfil: 'solicitante', status: 'ativo' });
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (isAdminGeral && !empresaId) {
      setErroMsg('Selecione a empresa antes de salvar.');
      return;
    }
    setErroMsg('');
    setMsg('');
    const body: Record<string, unknown> = {
      ...empresaBody,
      id: form.id,
      nome: (form.nome || '').trim(),
      telefone: form.telefone || null,
      whatsapp: form.whatsapp || null,
      perfil: form.perfil || 'solicitante',
      status: form.status || 'ativo',
    };
    if (!editando) {
      body.email = (form.email || '').trim();
      body.senha = form.senha || '';
    } else if (form.senha) {
      body.senha = form.senha;
    }
    try {
      if (form.id) await api('/usuarios/usuarios.php', { method: 'PUT', body });
      else await api('/usuarios/usuarios.php', { method: 'POST', body });
      setMsg(editando ? 'Permissão do usuário atualizada.' : 'Usuário criado.');
      limparForm();
      await carregar();
    } catch (e2) {
      setErroMsg(erro(e2));
    }
  }

  async function excluir(id: number) {
    if (!window.confirm('Excluir este usuário?')) return;
    setErroMsg('');
    setMsg('');
    try {
      await api('/usuarios/usuarios.php?id=' + id + (isAdminGeral ? '&empresa_id=' + empresaId : ''), { method: 'DELETE' });
      setMsg('Usuário excluído.');
      await carregar();
    } catch (e) {
      setErroMsg(erro(e));
    }
  }

  return (
    <div>
      <div className="titulo-pg">
        <h1>Usuários e permissões</h1>
        <button className="btn sec sm" onClick={() => carregar().catch((e) => setErroMsg(erro(e)))}>Atualizar</button>
      </div>
      {erroMsg && <div className="msg-erro">{erroMsg}</div>}
      {msg && <div className="msg-ok">{msg}</div>}

      {isAdminGeral && (
        <div className="card" style={{ marginBottom: 16 }}>
          <label>Empresa</label>
          <select value={empresaId} onChange={(e) => { setEmpresaId(e.target.value); limparForm(); }}>
            <option value="">Selecione</option>
            {empresas.map((e) => <option key={e.id} value={e.id}>{e.nome} - {e.status}</option>)}
          </select>
        </div>
      )}

      <form className="card" onSubmit={salvar} style={{ marginBottom: 16 }}>
        <h3>{editando ? 'Editar permissão' : 'Novo usuário'}</h3>
        <div className="grid cols2">
          <div><label>Nome *</label><input className="input" value={form.nome || ''} onChange={(e) => setForm({ ...form, nome: e.target.value })} required /></div>
          <div><label>E-mail *</label><input className="input" type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={editando} required={!editando} /></div>
          <div>
            <label>Permissão</label>
            <select value={form.perfil || 'solicitante'} onChange={(e) => setForm({ ...form, perfil: e.target.value })}>
              {Object.entries(PERFIS).map(([valor, label]) => <option key={valor} value={valor}>{label}</option>)}
            </select>
          </div>
          <div>
            <label>Status</label>
            <select value={form.status || 'ativo'} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="ativo">Ativo</option>
              <option value="inativo">Inativo</option>
            </select>
          </div>
          <div><label>{editando ? 'Nova senha (opcional)' : 'Senha *'}</label><input className="input" type="password" value={form.senha || ''} onChange={(e) => setForm({ ...form, senha: e.target.value })} required={!editando} /></div>
          <div><label>WhatsApp</label><input className="input" value={form.whatsapp || ''} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} /></div>
          <div><label>Telefone</label><input className="input" value={form.telefone || ''} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
        </div>
        <div className="form-actions">
          {editando && <button type="button" className="btn sec" onClick={limparForm}>Cancelar</button>}
          <button className="btn" disabled={isAdminGeral && !empresaId}>{editando ? 'Salvar permissão' : 'Adicionar usuário'}</button>
        </div>
      </form>

      <div className="tabela-wrap">
        <table>
          <thead><tr><th>Nome</th><th>E-mail</th><th>Permissão</th><th>Contato</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {lista.map((u) => (
              <tr key={u.id}>
                <td><strong>{u.nome}</strong></td>
                <td>{u.email}</td>
                <td>{perfilLabel(u.perfil)}</td>
                <td>{u.whatsapp || u.telefone || '-'}</td>
                <td><span className="badge">{u.status}</span></td>
                <td className="acoes">
                  <button className="btn sec sm" onClick={() => setForm({ ...u, senha: '' })}>Editar permissão</button>
                  <button className="btn danger sm" onClick={() => excluir(u.id)}>Excluir</button>
                </td>
              </tr>
            ))}
            {!lista.length && <tr><td colSpan={6} className="vazio">Nenhum usuário cadastrado.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
