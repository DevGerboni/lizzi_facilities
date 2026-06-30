import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { rotuloStatus, rotuloTipo, corStatus } from '../lib/rotulos';

interface OS {
  id: number;
  codigo: string;
  tipo_os: string;
  status: string;
  unidade_nome: string | null;
  local_nome: string | null;
  tecnico_id: number | null;
  tecnico_nome: string | null;
  data_agendada: string | null;
  hora_agendada: string | null;
}
interface Tecnico { id: number; nome: string; }

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const STATUS = ['aberto', 'em_andamento', 'interrompido', 'aguardando_aprovacao', 'concluido', 'cancelado'];

function isoDia(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function nomeMes(d: Date): string {
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

function hora(os: OS): string {
  return os.hora_agendada ? String(os.hora_agendada).slice(0, 5) : '--:--';
}

export default function Agenda() {
  const [lista, setLista] = useState<OS[]>([]);
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [erro, setErro] = useState('');
  const [mes, setMes] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [tecnicoId, setTecnicoId] = useState('');
  const [status, setStatus] = useState('');

  async function carregar() {
    setErro('');
    try {
      const [os, tec] = await Promise.all([
        api<OS[]>('/os/os_listar.php'),
        api<Tecnico[]>('/cadastros/tecnicos.php').catch(() => [] as Tecnico[]),
      ]);
      setLista(os);
      setTecnicos(tec);
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    }
  }
  useEffect(() => { carregar(); }, []);

  const filtradas = useMemo(() => lista.filter((os) => {
    if (tecnicoId && String(os.tecnico_id || '') !== tecnicoId) return false;
    if (status && os.status !== status) return false;
    return true;
  }), [lista, tecnicoId, status]);

  const diasMes = useMemo(() => {
    const primeiro = new Date(mes.getFullYear(), mes.getMonth(), 1);
    const inicio = new Date(primeiro);
    inicio.setDate(1 - primeiro.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(inicio);
      d.setDate(inicio.getDate() + i);
      return d;
    });
  }, [mes]);

  function mudarMes(delta: number) {
    setMes((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
  }

  function osDoDia(d: Date): OS[] {
    const key = isoDia(d);
    return filtradas
      .filter((os) => os.data_agendada === key)
      .sort((a, b) => hora(a).localeCompare(hora(b)));
  }

  const semAgenda = filtradas.filter((os) => !os.data_agendada);

  return (
    <div>
      <div className="titulo-pg">
        <h1>Agenda</h1>
        <button type="button" className="btn sec sm" onClick={carregar}>Atualizar</button>
      </div>

      <div className="card agenda-toolbar">
        <div>
          <label>Técnico</label>
          <select value={tecnicoId} onChange={(e) => setTecnicoId(e.target.value)}>
            <option value="">Todos</option>
            {tecnicos.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
        </div>
        <div>
          <label>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todos</option>
            {STATUS.map((s) => <option key={s} value={s}>{rotuloStatus(s)}</option>)}
          </select>
        </div>
        <div className="agenda-mes">
          <button type="button" className="btn sec sm" onClick={() => mudarMes(-1)}>Anterior</button>
          <strong>{nomeMes(mes)}</strong>
          <button type="button" className="btn sec sm" onClick={() => mudarMes(1)}>Próximo</button>
        </div>
      </div>

      {erro && <div className="msg-erro">{erro}</div>}

      <div className="agenda-calendar">
        {DIAS.map((d) => <div key={d} className="agenda-weekday">{d}</div>)}
        {diasMes.map((d) => {
          const fora = d.getMonth() !== mes.getMonth();
          const hoje = isoDia(d) === isoDia(new Date());
          const itens = osDoDia(d);
          return (
            <div key={isoDia(d)} className={'agenda-day' + (fora ? ' fora' : '') + (hoje ? ' hoje' : '')}>
              <div className="agenda-day-num">{d.getDate()}</div>
              <div className="agenda-items">
                {itens.slice(0, 4).map((os) => (
                  <Link key={os.id} to={'/app/os/' + os.id} className="agenda-os" style={{ borderLeftColor: corStatus(os.status) }}>
                    <b>{hora(os)} {os.codigo}</b>
                    <span>{rotuloTipo(os.tipo_os)} · {os.tecnico_nome || 'sem técnico'}</span>
                    <small>{[os.unidade_nome, os.local_nome].filter(Boolean).join(' / ') || '-'}</small>
                  </Link>
                ))}
                {itens.length > 4 && <span className="agenda-more">+ {itens.length - 4} OS</span>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Sem agendamento</h3>
        <div className="agenda-sem-lista">
          {semAgenda.map((os) => (
            <Link key={os.id} to={'/app/os/' + os.id} className="agenda-os" style={{ borderLeftColor: corStatus(os.status) }}>
              <b>{os.codigo}</b>
              <span>{rotuloStatus(os.status)} · {os.tecnico_nome || 'sem técnico'}</span>
              <small>{[os.unidade_nome, os.local_nome].filter(Boolean).join(' / ') || '-'}</small>
            </Link>
          ))}
          {!semAgenda.length && <p className="vazio">Nenhuma OS sem agendamento nos filtros atuais.</p>}
        </div>
      </div>
    </div>
  );
}
