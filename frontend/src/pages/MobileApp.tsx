import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api, getToken, clearSession, urlImagem } from '../lib/api';
import { useAuth } from '../lib/auth';
import { PRIORIDADE, dataHora, rotuloPrioridade, rotuloStatus } from '../lib/rotulos';
import AssinaturaPad from '../components/AssinaturaPad';

interface Opcao { id: number; nome: string; }
interface Piso extends Opcao { unidade_id: number; }
interface Local extends Opcao { unidade_id: number; piso_id: number; }
interface Tecnico extends Opcao { unidades?: number[]; }
interface Categoria extends Opcao { tipo: string; }
interface Ativo extends Opcao { unidade_id: number; piso_id: number; local_id: number; qr_code?: string | null; categoria_id?: number | null; }
interface OSItem {
  id: number;
  codigo: string;
  status: string;
  tipo_os: string;
  prioridade: string;
  unidade_nome: string | null;
  piso_nome: string | null;
  local_nome: string | null;
  ativo_nome: string | null;
  tecnico_nome: string | null;
  data_agendada: string | null;
  hora_agendada: string | null;
  created_at: string;
}
interface ChecklistResp {
  id: number;
  checklist_item_id: number;
  descricao: string;
  marcado: boolean | string;
  observacao: string | null;
  imagem_url: string | null;
}
interface ChecklistItem {
  id: number;
  descricao: string;
  obrigatorio: boolean | string;
  exige_foto: boolean | string;
  exige_observacao: boolean | string;
  ordem: number;
}
interface ChecklistModelo { id: number; nome: string; itens: ChecklistItem[]; }
interface OSDetalheData extends OSItem {
  ativo_id: number | null;
  ativo_categoria_id: number | null;
  solicitante_nome: string | null;
  avaria: string | null;
  descricao: string | null;
  observacao: string | null;
  tempo_total_minutos: number | null;
  assinatura_tecnico_url: string | null;
  assinatura_cliente_url: string | null;
  checklist: ChecklistResp[];
}

const STATUS = ['aberto', 'em_andamento', 'interrompido', 'aguardando_aprovacao', 'concluido', 'cancelado'];

function bool(v: unknown): boolean {
  return v === true || v === 'true' || v === '1' || v === 1;
}

function podeMudarEstado(atual: string, destino: string): boolean {
  if (atual === destino) return false;
  if (['concluido', 'cancelado'].includes(atual)) return false;
  if (destino === 'cancelado') return true;
  if (atual === 'aberto') return destino === 'em_andamento';
  if (atual === 'em_andamento') return ['interrompido', 'aguardando_aprovacao'].includes(destino);
  if (atual === 'interrompido') return destino === 'em_andamento';
  if (atual === 'aguardando_aprovacao') return destino === 'concluido';
  return false;
}

function rotuloBotao(atual: string, destino: string): string {
  if (atual === 'aberto' && destino === 'em_andamento') return 'Iniciar';
  if (atual === 'interrompido' && destino === 'em_andamento') return 'Retomar';
  return rotuloStatus(destino);
}

function localOs(os: Pick<OSItem, 'unidade_nome' | 'piso_nome' | 'local_nome' | 'ativo_nome'>): string {
  return [os.unidade_nome, os.piso_nome, os.local_nome].filter(Boolean).join(' / ') || os.ativo_nome || '-';
}

export default function MobileApp() {
  const { user, login, logout, isPremium } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [msg, setMsg] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [aba, setAba] = useState<'os' | 'agenda' | 'nova'>('os');
  const [lista, setLista] = useState<OSItem[]>([]);
  const [statusFiltro, setStatusFiltro] = useState('');
  const [detalheId, setDetalheId] = useState<number | null>(null);

  async function entrar(e: FormEvent) {
    e.preventDefault();
    setErro('');
    setCarregando(true);
    try {
      await login(email.trim(), senha);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Falha no login');
    } finally {
      setCarregando(false);
    }
  }

  async function sair() {
    await logout();
    clearSession();
  }

  async function carregarLista() {
    setErro('');
    const qs = statusFiltro ? '?status=' + encodeURIComponent(statusFiltro) : '';
    try {
      setLista(await api<OSItem[]>('/os/os_listar.php' + qs));
    } catch (err) {
      setErro(err instanceof Error ? err.message : String(err));
    }
  }

  useEffect(() => {
    if (getToken()) carregarLista();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFiltro, user?.id]);

  const agenda = useMemo(() => (
    lista
      .filter((os) => os.data_agendada && !['concluido', 'cancelado'].includes(os.status))
      .sort((a, b) => String(a.data_agendada).localeCompare(String(b.data_agendada)) || String(a.hora_agendada || '').localeCompare(String(b.hora_agendada || '')))
  ), [lista]);

  if (!getToken()) {
    return (
      <div className="mobile-app login">
        <div className="mobile-login-card">
          <img src="./logo_tipo.png" alt="Lizzi Facilities" />
          <h1>App de campo</h1>
          <p>Entre para executar OS, checklist, agenda e assinaturas.</p>
          {erro && <div className="msg-erro">{erro}</div>}
          <form onSubmit={entrar}>
            <label>E-mail</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <label>Senha</label>
            <input className="input" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
            <button className="btn lg" disabled={carregando}>{carregando ? 'Entrando...' : 'Entrar'}</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="mobile-app">
      <header className="mobile-top">
        <div>
          <strong>Lizzi Facilities</strong>
          <span>{user?.nome || 'Equipe de campo'}</span>
        </div>
        <button className="btn sec sm" onClick={sair}>Sair</button>
      </header>

      {erro && <div className="mobile-alert msg-erro">{erro}</div>}
      {msg && <div className="mobile-alert msg-ok">{msg}</div>}

      {detalheId ? (
        <MobileOSDetalhe
          id={detalheId}
          isPremium={isPremium}
          voltar={() => { setDetalheId(null); carregarLista(); }}
          setErro={setErro}
          setMsg={setMsg}
        />
      ) : (
        <>
          {aba === 'os' && (
            <section className="mobile-screen">
              <div className="mobile-section-head">
                <h2>Ordens de serviço</h2>
                <button className="btn sec sm" onClick={carregarLista}>Atualizar</button>
              </div>
              <div className="mobile-status-tabs">
                <button className={!statusFiltro ? 'on' : ''} onClick={() => setStatusFiltro('')}>Todas</button>
                {STATUS.map((s) => <button key={s} className={statusFiltro === s ? 'on' : ''} onClick={() => setStatusFiltro(s)}>{rotuloStatus(s)}</button>)}
              </div>
              <div className="mobile-os-list">
                {lista.map((os) => <MobileOSCard key={os.id} os={os} abrir={() => setDetalheId(os.id)} />)}
                {!lista.length && <p className="vazio">Nenhuma OS encontrada.</p>}
              </div>
            </section>
          )}

          {aba === 'agenda' && (
            <section className="mobile-screen">
              <div className="mobile-section-head"><h2>Agenda do técnico</h2><button className="btn sec sm" onClick={carregarLista}>Atualizar</button></div>
              <div className="mobile-os-list">
                {agenda.map((os) => <MobileOSCard key={os.id} os={os} abrir={() => setDetalheId(os.id)} agenda />)}
                {!agenda.length && <p className="vazio">Nenhuma OS agendada em aberto.</p>}
              </div>
            </section>
          )}

          {aba === 'nova' && <MobileNovaOS onCriada={(id) => { setDetalheId(id); carregarLista(); }} setErro={setErro} setMsg={setMsg} />}
        </>
      )}

      {!detalheId && (
        <nav className="mobile-nav">
          <button className={aba === 'os' ? 'on' : ''} onClick={() => setAba('os')}>OS</button>
          <button className={aba === 'agenda' ? 'on' : ''} onClick={() => setAba('agenda')}>Agenda</button>
          <button className={aba === 'nova' ? 'on' : ''} onClick={() => setAba('nova')}>Nova OS</button>
        </nav>
      )}
    </div>
  );
}

function MobileOSCard({ os, abrir, agenda = false }: { os: OSItem; abrir: () => void; agenda?: boolean }) {
  return (
    <button className="mobile-os-card" onClick={abrir}>
      <span className={'badge st-' + os.status}>{rotuloStatus(os.status)}</span>
      <strong>{os.codigo}</strong>
      <small>{os.tipo_os} - {rotuloPrioridade(os.prioridade)}</small>
      <span>{localOs(os)}</span>
      <em>{agenda ? dataHora([os.data_agendada, os.hora_agendada].filter(Boolean).join(' ')) : os.tecnico_nome || 'Sem técnico'}</em>
    </button>
  );
}

function MobileNovaOS({ onCriada, setErro, setMsg }: { onCriada: (id: number) => void; setErro: (s: string) => void; setMsg: (s: string) => void }) {
  const { isPremium } = useAuth();
  const [unidades, setUnidades] = useState<Opcao[]>([]);
  const [pisos, setPisos] = useState<Piso[]>([]);
  const [locais, setLocais] = useState<Local[]>([]);
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [tipos, setTipos] = useState<Categoria[]>([]);
  const [ativos, setAtivos] = useState<Ativo[]>([]);
  const [form, setForm] = useState({
    unidade_id: '', piso_id: '', local_id: '', ativo_id: '', tecnico_id: '', tipo_os: '', prioridade: 'media',
    avaria: '', descricao: '', data_agendada: '', hora_agendada: '',
  });
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    Promise.all([
      api<Opcao[]>('/cadastros/unidades.php'),
      api<Tecnico[]>('/cadastros/tecnicos.php'),
      api<Categoria[]>('/cadastros/categorias.php'),
    ]).then(([u, t, c]) => {
      setUnidades(u);
      setTecnicos(t);
      setTipos(c);
      setForm((f) => ({ ...f, tipo_os: f.tipo_os || c[0]?.nome || 'Corretiva' }));
    }).catch((e) => setErro(e instanceof Error ? e.message : String(e)));
  }, [setErro]);

  useEffect(() => {
    if (isPremium) api<Ativo[]>('/ativos/ativos.php').then(setAtivos).catch(() => {});
  }, [isPremium]);

  useEffect(() => {
    setPisos([]);
    setLocais([]);
    setForm((f) => ({ ...f, piso_id: '', local_id: '' }));
    if (form.unidade_id) api<Piso[]>('/cadastros/pisos.php?unidade_id=' + form.unidade_id).then(setPisos).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.unidade_id]);

  useEffect(() => {
    setLocais([]);
    setForm((f) => ({ ...f, local_id: '' }));
    if (form.piso_id) api<Local[]>('/cadastros/locais.php?piso_id=' + form.piso_id).then(setLocais).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.piso_id]);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const tecnicosDaUnidade = tecnicos.filter((t) => !form.unidade_id || !t.unidades?.length || t.unidades.includes(Number(form.unidade_id)));
  const ativosDoLocal = ativos.filter((a) => !form.local_id || a.local_id === Number(form.local_id));

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setErro('');
    setMsg('');
    setSalvando(true);
    try {
      const criado = await api<{ id: number }>('/os/os_criar.php', {
        method: 'POST',
        body: {
          ...(form.unidade_id ? { unidade_id: Number(form.unidade_id) } : {}),
          ...(form.piso_id ? { piso_id: Number(form.piso_id) } : {}),
          ...(form.local_id ? { local_id: Number(form.local_id) } : {}),
          ...(form.ativo_id ? { ativo_id: Number(form.ativo_id) } : {}),
          ...(form.tecnico_id ? { tecnico_id: Number(form.tecnico_id) } : {}),
          tipo_os: form.tipo_os,
          prioridade: form.prioridade,
          avaria: form.avaria || null,
          descricao: form.descricao || null,
          data_agendada: form.data_agendada || null,
          hora_agendada: form.hora_agendada || null,
        },
      });
      setMsg('OS criada.');
      onCriada(criado.id);
    } catch (err) {
      setErro(err instanceof Error ? err.message : String(err));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <section className="mobile-screen">
      <h2>Nova OS</h2>
      <form className="mobile-form" onSubmit={salvar}>
        <label>Tipo de chamado</label>
        <select value={form.tipo_os} onChange={(e) => set('tipo_os', e.target.value)} required>
          {tipos.map((t) => <option key={t.id} value={t.nome}>{t.nome}</option>)}
          {!tipos.length && <option value="Corretiva">Corretiva</option>}
        </select>
        <label>Prioridade</label>
        <select value={form.prioridade} onChange={(e) => set('prioridade', e.target.value)}>
          {Object.entries(PRIORIDADE).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <label>Unidade</label>
        <select value={form.unidade_id} onChange={(e) => set('unidade_id', e.target.value)}>
          <option value="">Selecione</option>
          {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
        </select>
        <label>Piso</label>
        <select value={form.piso_id} onChange={(e) => set('piso_id', e.target.value)} disabled={!form.unidade_id}>
          <option value="">Selecione</option>
          {pisos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
        <label>Local</label>
        <select value={form.local_id} onChange={(e) => set('local_id', e.target.value)} disabled={!form.piso_id}>
          <option value="">Selecione</option>
          {locais.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
        </select>
        {isPremium && (
          <>
            <label>Equipamento</label>
            <select value={form.ativo_id} onChange={(e) => set('ativo_id', e.target.value)}>
              <option value="">Sem equipamento</option>
              {ativosDoLocal.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
          </>
        )}
        <label>Atribuir técnico</label>
        <select value={form.tecnico_id} onChange={(e) => set('tecnico_id', e.target.value)}>
          <option value="">Sem atribuição</option>
          {tecnicosDaUnidade.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </select>
        <label>Data agendada</label>
        <input type="date" value={form.data_agendada} onChange={(e) => set('data_agendada', e.target.value)} />
        <label>Hora agendada</label>
        <input type="time" value={form.hora_agendada} onChange={(e) => set('hora_agendada', e.target.value)} />
        <label>Avaria</label>
        <input value={form.avaria} onChange={(e) => set('avaria', e.target.value)} placeholder="Resumo curto" />
        <label>Descrição</label>
        <textarea value={form.descricao} onChange={(e) => set('descricao', e.target.value)} rows={4} placeholder="Detalhes do chamado" />
        <button className="btn lg" disabled={salvando}>{salvando ? 'Criando...' : 'Criar OS'}</button>
      </form>
    </section>
  );
}

function MobileOSDetalhe({ id, isPremium, voltar, setErro, setMsg }: {
  id: number;
  isPremium: boolean;
  voltar: () => void;
  setErro: (s: string) => void;
  setMsg: (s: string) => void;
}) {
  const [os, setOs] = useState<OSDetalheData | null>(null);
  const [modelos, setModelos] = useState<ChecklistModelo[]>([]);
  const [respostas, setRespostas] = useState<Record<number, { marcado: boolean; observacao: string; imagem_url: string }>>({});
  const [salvandoChecklist, setSalvandoChecklist] = useState(false);

  async function carregar() {
    const data = await api<OSDetalheData>('/os/os_detalhe.php?id=' + id);
    setOs(data);
    const mapa: Record<number, { marcado: boolean; observacao: string; imagem_url: string }> = {};
    (data.checklist || []).forEach((r) => {
      mapa[r.checklist_item_id] = { marcado: bool(r.marcado), observacao: r.observacao || '', imagem_url: r.imagem_url || '' };
    });
    setRespostas(mapa);
    if (isPremium && data.ativo_categoria_id) {
      setModelos(await api<ChecklistModelo[]>('/checklist/por_categoria.php?categoria_id=' + data.ativo_categoria_id));
    } else {
      setModelos([]);
    }
  }

  useEffect(() => {
    carregar().catch((e) => setErro(e instanceof Error ? e.message : String(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function setResposta(itemId: number, patch: Partial<{ marcado: boolean; observacao: string; imagem_url: string }>) {
    setRespostas((atuais) => ({
      ...atuais,
      [itemId]: { ...(atuais[itemId] || { marcado: false, observacao: '', imagem_url: '' }), ...patch },
    }));
  }

  async function mudarStatus(status: string) {
    if (!os) return;
    setErro('');
    setMsg('');
    try {
      await api('/os/os_atualizar_status.php', { method: 'POST', body: { id: os.id, status } });
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    }
  }

  async function salvarChecklist(e: FormEvent) {
    e.preventDefault();
    if (!os) return;
    const itens = modelos.flatMap((m) => m.itens);
    setSalvandoChecklist(true);
    setErro('');
    try {
      for (const item of itens) {
        const resp = respostas[item.id];
        if (bool(item.obrigatorio) && !resp?.marcado) throw new Error('Marque o item obrigatório: ' + item.descricao);
        if (bool(item.exige_observacao) && !(resp?.observacao || '').trim()) throw new Error('Preencha a observação: ' + item.descricao);
      }
      await api('/checklist/respostas.php', {
        method: 'POST',
        body: {
          ordem_servico_id: os.id,
          respostas: itens.map((item) => ({
            checklist_item_id: item.id,
            marcado: Boolean(respostas[item.id]?.marcado),
            observacao: respostas[item.id]?.observacao || null,
            imagem_url: respostas[item.id]?.imagem_url || null,
          })),
        },
      });
      setMsg('Checklist salvo.');
      await carregar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : String(err));
    } finally {
      setSalvandoChecklist(false);
    }
  }

  async function salvarAssinatura(tipo: 'tecnico' | 'cliente', arquivo: File) {
    if (!os) return;
    const fd = new FormData();
    fd.append('ordem_servico_id', String(os.id));
    fd.append('tipo', tipo);
    fd.append('assinatura', arquivo);
    try {
      await api('/os/os_assinatura.php', { method: 'POST', body: fd, isForm: true });
      setMsg('Assinatura salva.');
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    }
  }

  if (!os) return <section className="mobile-screen"><p className="vazio">Carregando OS...</p></section>;
  const encerrada = ['concluido', 'cancelado'].includes(os.status);

  return (
    <section className="mobile-screen mobile-detail">
      <button className="btn sec sm" onClick={voltar}>Voltar</button>
      <div className="mobile-detail-title">
        <span className={'badge st-' + os.status}>{rotuloStatus(os.status)}</span>
        <h2>{os.codigo}</h2>
        <p>{os.tipo_os} - {rotuloPrioridade(os.prioridade)}</p>
      </div>
      <div className="mobile-info">
        <strong>{localOs(os)}</strong>
        <span>Técnico: {os.tecnico_nome || '-'}</span>
        <span>Solicitante: {os.solicitante_nome || '-'}</span>
        {os.avaria && <span>Avaria: {os.avaria}</span>}
        {os.descricao && <span>Descrição: {os.descricao}</span>}
      </div>

      <h3>Estado da OS</h3>
      <div className="estado-os-grid">
        {STATUS.map((estado) => {
          const atual = os.status === estado;
          const habilitado = podeMudarEstado(os.status, estado);
          return (
            <button key={estado} type="button" className={'estado-os-btn st-' + estado + (atual ? ' atual' : '')} disabled={!habilitado} onClick={() => mudarStatus(estado)}>
              {rotuloBotao(os.status, estado)}
            </button>
          );
        })}
      </div>

      {isPremium && (
        <div className="mobile-panel">
          <h3>Checklist</h3>
          {!os.ativo_categoria_id && <p className="vazio">OS sem equipamento/tipo de chamado vinculado para checklist.</p>}
          {!!os.ativo_categoria_id && !modelos.length && <p className="vazio">Nenhum checklist cadastrado para este tipo de chamado.</p>}
          {!!modelos.length && (
            <form onSubmit={salvarChecklist}>
              {modelos.map((modelo) => (
                <div key={modelo.id} className="mobile-check-model">
                  <strong>{modelo.nome}</strong>
                  {modelo.itens.map((item) => (
                    <div key={item.id} className="mobile-check-item">
                      <label className="check-line">
                        <input type="checkbox" checked={Boolean(respostas[item.id]?.marcado)} onChange={(e) => setResposta(item.id, { marcado: e.target.checked })} disabled={encerrada} />
                        <span>{item.descricao}{bool(item.obrigatorio) ? ' *' : ''}</span>
                      </label>
                      <textarea value={respostas[item.id]?.observacao || ''} onChange={(e) => setResposta(item.id, { observacao: e.target.value })} placeholder="Observação" disabled={encerrada} />
                    </div>
                  ))}
                </div>
              ))}
              {!encerrada && <button className="btn" disabled={salvandoChecklist}>{salvandoChecklist ? 'Salvando...' : 'Salvar checklist'}</button>}
            </form>
          )}
        </div>
      )}

      <div className="mobile-panel">
        <h3>Assinaturas</h3>
        <AssinaturaPad titulo="Assinatura do técnico" imagemUrl={urlImagem(os.assinatura_tecnico_url)} bloqueado={encerrada} onSalvar={(arquivo) => salvarAssinatura('tecnico', arquivo)} />
        <AssinaturaPad titulo="Assinatura do cliente" imagemUrl={urlImagem(os.assinatura_cliente_url)} bloqueado={encerrada} onSalvar={(arquivo) => salvarAssinatura('cliente', arquivo)} />
      </div>
    </section>
  );
}
