import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { rotuloStatus, corStatus, rotuloTipo, STATUS_LISTA } from '../lib/rotulos';

interface OS {
  id: number;
  codigo: string;
  tipo_os: string;
  status: string;
  unidade_nome: string;
  local_nome: string;
  tecnico_nome: string | null;
}

export default function OSLista() {
  const [lista, setLista] = useState<OS[]>([]);
  const [erro, setErro] = useState('');
  const [status, setStatus] = useState('');

  async function carregar() {
    setErro('');
    try { setLista(await api<OS[]>('/os/os_listar.php' + (status ? '?status=' + status : ''))); }
    catch (e) { setErro(e instanceof Error ? e.message : String(e)); }
  }
  useEffect(() => { carregar(); }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div className="titulo-pg">
        <h1>Ordens de Serviço</h1>
        <Link to="/app/os/nova" className="btn">+ Nova OS</Link>
      </div>

      <div style={{ marginBottom: 12 }}>
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ maxWidth: 260 }}>
          <option value="">Todos os status</option>
          {STATUS_LISTA.map((s) => <option key={s} value={s}>{rotuloStatus(s)}</option>)}
        </select>
      </div>

      {erro && <div className="msg-erro">{erro}</div>}

      <div className="tabela-wrap">
        <table>
          <thead><tr><th>Código</th><th>Tipo</th><th>Local</th><th>Técnico</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {lista.map((os) => (
              <tr key={os.id}>
                <td><strong>{os.codigo}</strong></td>
                <td>{rotuloTipo(os.tipo_os)}</td>
                <td>{[os.unidade_nome, os.local_nome].filter(Boolean).join(' / ') || '—'}</td>
                <td>{os.tecnico_nome || '—'}</td>
                <td><span className="badge" style={{ background: 'transparent', color: corStatus(os.status), border: `1px solid ${corStatus(os.status)}` }}>{rotuloStatus(os.status)}</span></td>
                <td style={{ textAlign: 'right' }}><Link to={'/app/os/' + os.id} className="btn sec sm">Abrir</Link></td>
              </tr>
            ))}
            {!lista.length && <tr><td colSpan={6} className="vazio">Nenhuma OS encontrada.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
