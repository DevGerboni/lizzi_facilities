import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, urlImagem } from '../lib/api';
import { rotuloStatus, rotuloTipo, dataHora } from '../lib/rotulos';
import Loading from '../components/Loading';

interface OSItem { id: number; codigo: string; tipo_os: string; status: string; created_at: string; }
interface AtivoQR {
  id: number; nome: string; qr_code: string;
  patrimonio: string | null; marca: string | null; fabricante: string | null; modelo: string | null; numero_serie: string | null;
  foto_url: string | null; status: string;
  ordens_servico: OSItem[];
}

// Tela aberta ao escanear o QR de um ativo (ver QRAtivo no menu Ativos).
export default function QRAtivo() {
  const { codigo } = useParams();
  const [ativo, setAtivo] = useState<AtivoQR | null>(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    setErro('');
    api<AtivoQR>('/ativos/por_qr.php?codigo=' + encodeURIComponent(codigo || ''))
      .then(setAtivo)
      .catch((e) => setErro(e instanceof Error ? e.message : String(e)));
  }, [codigo]);

  if (erro) return <div className="msg-erro">{erro}</div>;
  if (!ativo) return <Loading />;

  return (
    <div>
      <div className="titulo-pg">
        <h1>{ativo.nome} <span className="badge">{ativo.qr_code}</span></h1>
        <Link to="/app/ativos" className="btn sec sm">Equipamentos</Link>
      </div>

      <div className="grid cols2">
        <div className="card">
          <h3>Equipamento</h3>
          <div className="os-dados">
            <div className="os-campo"><span className="k">Patrimônio</span><span className="v">{ativo.patrimonio || '-'}</span></div>
            <div className="os-campo"><span className="k">Marca</span><span className="v">{ativo.marca || '-'}</span></div>
            <div className="os-campo"><span className="k">Fabricante</span><span className="v">{ativo.fabricante || '-'}</span></div>
            <div className="os-campo"><span className="k">Modelo</span><span className="v">{ativo.modelo || '-'}</span></div>
            <div className="os-campo"><span className="k">Nº de série</span><span className="v">{ativo.numero_serie || '-'}</span></div>
            <div className="os-campo"><span className="k">Status</span><span className="v">{ativo.status}</span></div>
          </div>
          {ativo.foto_url && (
            <a href={urlImagem(ativo.foto_url)} target="_blank" rel="noreferrer">
              <img src={urlImagem(ativo.foto_url)} alt="" className="logo-preview" />
            </a>
          )}
          <div className="form-actions">
            <Link className="btn" to={'/app/os/nova?ativo=' + ativo.id}>+ Nova OS para este equipamento</Link>
          </div>
        </div>

        <div className="card">
          <h3>Ordens de serviço deste equipamento</h3>
          <div className="tabela-wrap" style={{ border: 0, boxShadow: 'none' }}>
            <table style={{ minWidth: 0 }}>
              <thead><tr><th>Código</th><th>Tipo</th><th>Status</th><th>Quando</th></tr></thead>
              <tbody>
                {ativo.ordens_servico.map((o) => (
                  <tr key={o.id}>
                    <td><Link to={'/app/os/' + o.id}>{o.codigo}</Link></td>
                    <td>{rotuloTipo(o.tipo_os)}</td>
                    <td>{rotuloStatus(o.status)}</td>
                    <td>{dataHora(o.created_at)}</td>
                  </tr>
                ))}
                {!ativo.ordens_servico.length && <tr><td colSpan={4} className="vazio">Nenhuma OS ainda.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
