import { useEffect, useState, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import Icone from '../components/Icones';
import Contador from '../components/Contador';
import { rotuloStatus, corStatus, rotuloPrioridade } from '../lib/rotulos';

interface Totais {
  total: number;
  atribuidas: number;
  abertas: number;
  em_andamento: number;
  aguardando_aprovacao: number;
  concluidas: number;
  interrompidas: number;
  canceladas: number;
  tempo_medio_minutos: number;
  horas_trabalhadas: number;
  tempo_medio_hhmm?: string;
  horas_trabalhadas_hhmm?: string;
  alta_urgente: number;
}
interface PorTecnico {
  tecnico_id: number;
  qtd: number;
  concluidas: number;
  interrompidas: number;
  aguardando_aprovacao: number;
  horas: number;
  tempo_medio_minutos: number;
  horas_hhmm?: string;
  tempo_medio_hhmm?: string;
  tecnico_nome: string | null;
}
interface PorUnidade { unidade_id: number; unidade_nome: string; qtd: number; }
interface PorStatus { status: string; qtd: number | string; }
interface PorPrioridade { prioridade: string; qtd: number | string; }
interface PorTipo { tipo: string; qtd: number | string; }
interface Indicadores { totais: Totais; por_tecnico: PorTecnico[]; por_unidade: PorUnidade[]; por_status?: PorStatus[]; por_prioridade?: PorPrioridade[]; por_tipo?: PorTipo[]; }

function Stat({ icone, titulo, valor, cor, detalhe }: { icone: string; titulo: string; valor: ReactNode; cor: string; detalhe?: string }) {
  return (
    <div className="stat">
      <div className="stat-ic" style={{ background: cor + '1f', color: cor }}><Icone nome={icone} size={24} /></div>
      <div>
        <div className="stat-v" style={{ color: cor }}>{valor}</div>
        <div className="stat-l">{titulo}</div>
        {detalhe && <div style={{ color: 'var(--texto-suave)', fontSize: 12 }}>{detalhe}</div>}
      </div>
    </div>
  );
}

interface Fatia { rotulo: string; qtd: number; cor: string; }
function Barras({ titulo, fatias }: { titulo: string; fatias: Fatia[] }) {
  const max = Math.max(1, ...fatias.map((f) => f.qtd));
  return (
    <div className="card">
      <h3>{titulo}</h3>
      <div className="barras">
        {fatias.map((f) => (
          <div className="barra-item" key={f.rotulo}>
            <span className="barra-lbl">{f.rotulo}</span>
            <span className="barra-track"><span className="barra-fill" style={{ width: (f.qtd / max) * 100 + '%', background: f.cor }} /></span>
            <span className="barra-qtd">{f.qtd}</span>
          </div>
        ))}
        {!fatias.some((f) => f.qtd > 0) && <p className="vazio">Sem dados ainda</p>}
      </div>
    </div>
  );
}

const PRIO_COR: Record<string, string> = { baixa: '#64748b', media: '#2563eb', alta: '#d97706', urgente: '#dc2626' };

export default function Dashboard() {
  const { user } = useAuth();
  const [ind, setInd] = useState<Indicadores | null>(null);
  const [erro, setErro] = useState('');
  const primeiroNome = (user?.nome || '').split(' ')[0];

  useEffect(() => {
    api<Indicadores>('/dashboard/indicadores.php').then(setInd).catch((e) => setErro(e.message));
  }, []);

  return (
    <div>
      <div className="saudacao" style={{ marginBottom: 20 }}>
        <h1>Olá, {primeiroNome || 'bem-vindo'}</h1>
        <p>Visão completa da operação: chamados, técnicos, horas trabalhadas e gargalos.</p>
      </div>

      <div className="cta-card" style={{ marginBottom: 20 }}>
        <div>
          <strong style={{ fontSize: 18 }}>Abrir um novo chamado</strong>
          <div style={{ opacity: .9, fontSize: 14 }}>Registre uma ocorrência em poucos cliques e acompanhe até a conclusão.</div>
        </div>
        <Link to="/app/os/nova" className="btn" style={{ background: '#fff', color: 'var(--azul)' }}>+ Nova OS</Link>
      </div>

      {erro && <div className="msg-erro">{erro}</div>}

      {ind && (
        <>
          <div className="dash-sec">Indicadores principais</div>
          <div className="grid cols4">
            <Stat icone="prancheta" titulo="Total de OS" cor="#2563eb" valor={<Contador alvo={ind.totais.total} />} detalhe="chamados registrados" />
            <Stat icone="engrenagem" titulo="Em execução" cor="#d97706" valor={<Contador alvo={ind.totais.em_andamento} />} detalhe={`${ind.totais.atribuidas ?? ind.totais.abertas} atribuídas`} />
            <Stat icone="checklist" titulo="Concluídas" cor="#16a34a" valor={<Contador alvo={ind.totais.concluidas} />} detalhe={`${ind.totais.tempo_medio_hhmm ?? ind.totais.tempo_medio_minutos} em média`} />
            <Stat icone="relogio" titulo="Horas trabalhadas" cor="#0a49c2" valor={ind.totais.horas_trabalhadas_hhmm ?? ind.totais.horas_trabalhadas} detalhe="soma do tempo das OS" />
          </div>

          <div className="dash-sec">Atenção &amp; qualidade</div>
          <div className="grid cols4">
            <Stat icone="raio" titulo="Alta / urgente" cor="#dc2626" valor={<Contador alvo={ind.totais.alta_urgente} />} detalhe="prioridade crítica" />
            <Stat icone="calendario" titulo="Aguardando cliente" cor="#7c3aed" valor={<Contador alvo={ind.totais.aguardando_aprovacao} />} detalhe="aprovação do cliente" />
            <Stat icone="chave" titulo="Interrompidas" cor="#ef4444" valor={<Contador alvo={ind.totais.interrompidas} />} detalhe="precisam de atenção" />
            <Stat icone="caixa" titulo="Canceladas" cor="#64748b" valor={<Contador alvo={ind.totais.canceladas} />} detalhe="encerradas sem execução" />
          </div>

          <div className="dash-sec">Distribuição dos chamados</div>
          <div className="grid cols2">
            <Barras titulo="Por status" fatias={(ind.por_status || []).map((s) => ({ rotulo: rotuloStatus(s.status), qtd: Number(s.qtd), cor: corStatus(s.status) }))} />
            <Barras titulo="Por prioridade" fatias={(ind.por_prioridade || []).map((p) => ({ rotulo: rotuloPrioridade(p.prioridade), qtd: Number(p.qtd), cor: PRIO_COR[p.prioridade] || '#2563eb' }))} />
            <Barras titulo="Por tipo de chamado" fatias={(ind.por_tipo || []).map((t) => ({ rotulo: t.tipo || '-', qtd: Number(t.qtd), cor: '#0a49c2' }))} />
          </div>

          <div className="dash-sec">Equipe e unidades</div>
          <div className="grid cols2">
            <div className="card">
              <h3>Produtividade por técnico</h3>
              <div className="tabela-wrap" style={{ border: 0, boxShadow: 'none' }}>
                <table style={{ minWidth: 0 }}>
                  <thead><tr><th>Técnico</th><th>OS</th><th>Concluídas</th><th>Interrompidas</th><th>Horas</th><th>Média</th></tr></thead>
                  <tbody>
                    {ind.por_tecnico.map((t) => (
                      <tr key={t.tecnico_id}>
                        <td>{t.tecnico_nome || '-'}</td>
                        <td>{t.qtd}</td>
                        <td>{t.concluidas}</td>
                        <td>{t.interrompidas}</td>
                        <td>{t.horas_hhmm ?? t.horas}</td>
                        <td>{t.tempo_medio_hhmm ?? t.tempo_medio_minutos}</td>
                      </tr>
                    ))}
                    {!ind.por_tecnico.length && <tr><td colSpan={6} className="vazio">Sem dados ainda</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="card">
              <h3>Volume por unidade</h3>
              <div className="tabela-wrap" style={{ border: 0, boxShadow: 'none' }}>
                <table style={{ minWidth: 0 }}>
                  <thead><tr><th>Unidade</th><th>Chamados</th></tr></thead>
                  <tbody>
                    {ind.por_unidade.map((u) => (
                      <tr key={u.unidade_id}><td>{u.unidade_nome}</td><td style={{ textAlign: 'right', fontWeight: 700 }}>{u.qtd}</td></tr>
                    ))}
                    {!ind.por_unidade.length && <tr><td colSpan={2} className="vazio">Sem dados ainda</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
