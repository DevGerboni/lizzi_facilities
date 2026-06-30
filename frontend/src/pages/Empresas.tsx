import { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface Empresa {
  id: number;
  nome: string;
  email: string | null;
  plano: string;
  status: string;
  db_nome: string | null;
  usuarios: number;
}

// estado visual: pendente (sem banco) | ativa | desativada
function situacao(e: Empresa): { label: string; cor: string } {
  if (!e.db_nome) return { label: 'Pendente', cor: '#d97706' };
  if (e.status === 'ativo') return { label: 'Ativa', cor: '#16a34a' };
  return { label: 'Desativada', cor: '#dc2626' };
}

export default function Empresas() {
  const [lista, setLista] = useState<Empresa[]>([]);
  const [erro, setErro] = useState('');
  const [msg, setMsg] = useState('');
  const [ocupado, setOcupado] = useState<number | null>(null);

  async function carregar() {
    setErro('');
    try { setLista(await api<Empresa[]>('/empresas/empresas.php')); }
    catch (e) { setErro(e instanceof Error ? e.message : String(e)); }
  }
  useEffect(() => { carregar(); }, []);

  async function acao(id: number, body: Record<string, unknown>, sucesso: string) {
    setMsg(''); setErro(''); setOcupado(id);
    try {
      await api('/empresas/empresas.php', { method: 'PUT', body: { id, ...body } });
      setMsg(sucesso); carregar();
    } catch (e) { setErro(e instanceof Error ? e.message : String(e)); }
    finally { setOcupado(null); }
  }

  const pendentes = lista.filter((e) => !e.db_nome).length;

  return (
    <div>
      <div className="titulo-pg">
        <h1>Empresas</h1>
        <button className="btn sec sm" onClick={carregar}>Atualizar</button>
      </div>

      {pendentes > 0 && (
        <div className="card" style={{ marginBottom: 16, borderLeft: '4px solid #d97706' }}>
          <strong>{pendentes}</strong> empresa(s) aguardando sua aprovação.
        </div>
      )}
      {erro && <div className="msg-erro">{erro}</div>}
      {msg && <div className="msg-ok">{msg}</div>}

      <div className="tabela-wrap">
        <table>
          <thead><tr><th>Empresa</th><th>E-mail</th><th>Plano</th><th>Usuários</th><th>Situação</th><th>Ações</th></tr></thead>
          <tbody>
            {lista.map((e) => {
              const s = situacao(e);
              const carregandoEsta = ocupado === e.id;
              return (
                <tr key={e.id}>
                  <td><strong>{e.nome}</strong></td>
                  <td>{e.email || '—'}</td>
                  <td>
                    <select value={e.plano} disabled={carregandoEsta}
                            onChange={(ev) => acao(e.id, { plano: ev.target.value }, 'Plano atualizado.')}
                            style={{ maxWidth: 130 }}>
                      <option value="simples">Simples</option>
                      <option value="premium">Premium</option>
                    </select>
                  </td>
                  <td>{e.usuarios}</td>
                  <td><span className="badge" style={{ background: 'transparent', color: s.cor, border: `1px solid ${s.cor}` }}>{s.label}</span></td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {!e.db_nome && (
                      <button className="btn sm" disabled={carregandoEsta}
                              onClick={() => acao(e.id, { status: 'ativo' }, 'Empresa aprovada! O ambiente foi criado.')}>
                        {carregandoEsta ? 'Aprovando…' : '✓ Aprovar'}
                      </button>
                    )}
                    {e.db_nome && e.status === 'ativo' && (
                      <button className="btn sec sm" disabled={carregandoEsta}
                              onClick={() => acao(e.id, { status: 'inativo' }, 'Empresa desativada.')}>Desativar</button>
                    )}
                    {e.db_nome && e.status !== 'ativo' && (
                      <button className="btn sm" disabled={carregandoEsta}
                              onClick={() => acao(e.id, { status: 'ativo' }, 'Empresa reativada.')}>Reativar</button>
                    )}
                  </td>
                </tr>
              );
            })}
            {!lista.length && <tr><td colSpan={6} className="vazio">Nenhuma empresa cadastrada ainda.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
