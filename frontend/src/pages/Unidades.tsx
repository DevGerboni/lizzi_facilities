import { useEffect, useState, FormEvent } from 'react';
import { api } from '../lib/api';

interface Unidade {
  id: number;
  nome: string;
  endereco: string | null;
  status: string;
}

export default function Unidades() {
  const [lista, setLista] = useState<Unidade[]>([]);
  const [erro, setErro] = useState('');
  const [editando, setEditando] = useState<Partial<Unidade> | null>(null);

  async function carregar() {
    setErro('');
    try { setLista(await api<Unidade[]>('/cadastros/unidades.php')); }
    catch (e) { setErro(e instanceof Error ? e.message : String(e)); }
  }
  useEffect(() => { carregar(); }, []);

  async function salvar(dados: Partial<Unidade>) {
    if (dados.id) await api('/cadastros/unidades.php', { method: 'PUT', body: dados });
    else await api('/cadastros/unidades.php', { method: 'POST', body: dados });
    setEditando(null); carregar();
  }
  async function excluir(id: number) {
    if (!window.confirm('Excluir esta unidade?')) return;
    await api('/cadastros/unidades.php?id=' + id, { method: 'DELETE' });
    carregar();
  }

  return (
    <div>
      <div className="titulo-pg">
        <h1>Unidades</h1>
        <button className="btn" onClick={() => setEditando({})}>+ Nova unidade</button>
      </div>
      {erro && <div className="msg-erro">{erro}</div>}

      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead><tr><th>Nome</th><th>Endereço</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {lista.map((u) => (
              <tr key={u.id}>
                <td>{u.nome}</td>
                <td>{u.endereco || '—'}</td>
                <td><span className="badge">{u.status}</span></td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button className="btn sec sm" onClick={() => setEditando(u)}>Editar</button>{' '}
                  <button className="btn danger sm" onClick={() => excluir(u.id)}>Excluir</button>
                </td>
              </tr>
            ))}
            {!lista.length && <tr><td colSpan={4} className="vazio">Nenhuma unidade cadastrada.</td></tr>}
          </tbody>
        </table>
      </div>

      {editando && <FormUnidade dados={editando} onSalvar={salvar} onFechar={() => setEditando(null)} />}
    </div>
  );
}

interface FormProps {
  dados: Partial<Unidade>;
  onSalvar: (d: Partial<Unidade>) => Promise<void>;
  onFechar: () => void;
}

function FormUnidade({ dados, onSalvar, onFechar }: FormProps) {
  const [nome, setNome] = useState(dados.nome || '');
  const [endereco, setEndereco] = useState(dados.endereco || '');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault(); setErro(''); setSalvando(true);
    try { await onSalvar({ id: dados.id, nome: nome.trim(), endereco }); }
    catch (err) { setErro(err instanceof Error ? err.message : String(err)); setSalvando(false); }
  }
  return (
    <div className="modal-bg" onClick={onFechar}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{dados.id ? 'Editar unidade' : 'Nova unidade'}</h2>
        {erro && <div className="msg-erro">{erro}</div>}
        <form onSubmit={enviar}>
          <label>Nome *</label>
          <input className="input" value={nome} onChange={(e) => setNome(e.target.value)} required />
          <label>Endereço</label>
          <input className="input" value={endereco || ''} onChange={(e) => setEndereco(e.target.value)} />
          <div style={{ display: 'flex', gap: 8, marginTop: 18, justifyContent: 'flex-end' }}>
            <button type="button" className="btn sec" onClick={onFechar}>Cancelar</button>
            <button className="btn" disabled={salvando}>{salvando ? 'Salvando…' : 'Salvar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
