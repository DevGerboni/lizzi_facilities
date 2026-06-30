import { useEffect, useState, FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, comprimirImagem } from '../lib/api';
import { useAuth } from '../lib/auth';
import { PRIORIDADE } from '../lib/rotulos';

interface Opcao { id: number; nome: string; }
interface Piso extends Opcao { unidade_id: number; }
interface Local extends Opcao { unidade_id: number; piso_id: number; }
interface Tecnico extends Opcao { unidades?: number[]; }
interface Ativo extends Opcao { unidade_id: number; piso_id: number; local_id: number; qr_code?: string | null; }
interface Categoria extends Opcao { tipo: string; status?: string; }

interface FormState {
  unidade_id: string;
  piso_id: string;
  local_id: string;
  ativo_id: string;
  tecnico_id: string;
  tipo_os: string;
  prioridade: string;
  avaria: string;
  descricao: string;
  observacao: string;
  data_agendada: string;
  hora_agendada: string;
}

export default function OSNova() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { isPremium } = useAuth();
  const [unidades, setUnidades] = useState<Opcao[]>([]);
  const [pisos, setPisos] = useState<Piso[]>([]);
  const [locais, setLocais] = useState<Local[]>([]);
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [ativos, setAtivos] = useState<Ativo[]>([]);
  const [tiposChamado, setTiposChamado] = useState<Categoria[]>([]);
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [form, setForm] = useState<FormState>({
    unidade_id: '', piso_id: '', local_id: '', ativo_id: params.get('ativo') || '', tecnico_id: '',
    tipo_os: '', prioridade: 'media', avaria: '', descricao: '', observacao: '',
    data_agendada: '', hora_agendada: '',
  });
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    Promise.all([
      api<Opcao[]>('/cadastros/unidades.php'),
      api<Tecnico[]>('/cadastros/tecnicos.php'),
      api<Categoria[]>('/cadastros/categorias.php'),
    ]).then(([u, t, c]) => {
      setUnidades(u);
      setTecnicos(t);
      setTiposChamado(c);
      setForm((atual) => ({ ...atual, tipo_os: atual.tipo_os || c[0]?.nome || 'Corretiva' }));
    }).catch((e) => setErro(e.message));
  }, []);

  // Ativos: carrega TODOS (Premium) — permite criar OS "por equipamento" sem
  // precisar escolher a localização antes (o backend herda do ativo).
  useEffect(() => {
    if (isPremium) api<Ativo[]>('/ativos/ativos.php').then(setAtivos).catch(() => {});
  }, [isPremium]);

  useEffect(() => {
    setPisos([]);
    setLocais([]);
    set('piso_id', '');
    set('local_id', '');
    if (form.unidade_id) {
      api<Piso[]>('/cadastros/pisos.php?unidade_id=' + form.unidade_id).then(setPisos).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.unidade_id]);

  useEffect(() => {
    setLocais([]);
    set('local_id', '');
    if (form.piso_id) api<Local[]>('/cadastros/locais.php?piso_id=' + form.piso_id).then(setLocais).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.piso_id]);

  const ativosDoLocal = ativos.filter((a) => !form.local_id || a.local_id === Number(form.local_id));
  const tecnicosDaUnidade = tecnicos.filter((t) => !form.unidade_id || !t.unidades?.length || t.unidades.includes(Number(form.unidade_id)));
  const opcoesTipoChamado = tiposChamado.length ? tiposChamado : [{ id: 0, nome: 'Corretiva', tipo: 'chamado' }, { id: -1, nome: 'Preventiva', tipo: 'chamado' }];
  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function uploadImagens(osId: number) {
    for (const arquivo of arquivos) {
      const fd = new FormData();
      fd.append('ordem_servico_id', String(osId));
      fd.append('tipo', 'abertura');
      fd.append('imagem', await comprimirImagem(arquivo));
      await api('/os/os_imagens.php', { method: 'POST', body: fd, isForm: true });
    }
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro('');
    setSalvando(true);
    try {
      const body = {
        ...(form.unidade_id ? { unidade_id: Number(form.unidade_id) } : {}),
        ...(form.piso_id ? { piso_id: Number(form.piso_id) } : {}),
        ...(form.local_id ? { local_id: Number(form.local_id) } : {}),
        ...(form.ativo_id ? { ativo_id: Number(form.ativo_id) } : {}),
        ...(form.tecnico_id ? { tecnico_id: Number(form.tecnico_id) } : {}),
        tipo_os: form.tipo_os,
        prioridade: form.prioridade,
        avaria: form.avaria || null,
        descricao: form.descricao || null,
        observacao: form.observacao || null,
        data_agendada: form.data_agendada || null,
        hora_agendada: form.hora_agendada || null,
      };
      const data = await api<{ id: number }>('/os/os_criar.php', { method: 'POST', body });
      if (arquivos.length) await uploadImagens(data.id);
      nav('/app/os/' + data.id);
    } catch (err) {
      setErro(err instanceof Error ? err.message : String(err));
      setSalvando(false);
    }
  }

  const tituloSecao = {
    fontSize: 12,
    fontWeight: 800,
    textTransform: 'uppercase' as const,
    letterSpacing: '.08em',
    color: 'var(--texto-suave)',
    margin: '18px 2px 8px',
  };

  return (
    <div>
      <div className="titulo-pg"><h1>Nova Ordem de Serviço</h1></div>
      {erro && <div className="msg-erro">{erro}</div>}
      <form className="card" onSubmit={enviar}>

        <div style={{ ...tituloSecao, marginTop: 0 }}>Localização</div>
        <div className="grid cols2">
          <div>
            <label>Unidade</label>
            <select value={form.unidade_id} onChange={(e) => set('unidade_id', e.target.value)}>
              <option value="">Selecione a unidade</option>
              {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
          </div>
          <div>
            <label>Piso</label>
            <select value={form.piso_id} onChange={(e) => set('piso_id', e.target.value)} disabled={!form.unidade_id}>
              <option value="">{form.unidade_id ? 'Selecione o piso' : 'Escolha a unidade primeiro'}</option>
              {pisos.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label>Local</label>
            <select value={form.local_id} onChange={(e) => set('local_id', e.target.value)} disabled={!form.piso_id}>
              <option value="">{form.piso_id ? 'Selecione o local' : 'Escolha o piso primeiro'}</option>
              {locais.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
            </select>
          </div>
        </div>

        {isPremium && (
          <>
            <div style={tituloSecao}>Equipamento</div>
            <div>
              <label>Equipamento (opcional)</label>
              <select value={form.ativo_id} onChange={(e) => set('ativo_id', e.target.value)}>
                <option value="">Sem equipamento (OS por local)</option>
                {ativosDoLocal.map((a) => <option key={a.id} value={a.id}>{a.nome} {a.qr_code ? '- ' + a.qr_code : ''}</option>)}
              </select>
            </div>
          </>
        )}

        <div style={tituloSecao}>Chamado</div>
        <div className="grid cols2">
          <div>
            <label>Tipo de chamado *</label>
            <select value={form.tipo_os} onChange={(e) => set('tipo_os', e.target.value)} required>
              <option value="">Selecione o tipo de chamado</option>
              {opcoesTipoChamado.map((c) => <option key={c.id} value={c.nome}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label>Prioridade</label>
            <select value={form.prioridade} onChange={(e) => set('prioridade', e.target.value)}>
              {Object.entries(PRIORIDADE).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label>Técnico</label>
            <select value={form.tecnico_id} onChange={(e) => set('tecnico_id', e.target.value)}>
              <option value="">Responsável abre a OS</option>
              {tecnicosDaUnidade.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          </div>
        </div>

        <div style={tituloSecao}>Agendamento</div>
        <div className="grid cols2">
          <div>
            <label>Data agendada</label>
            <input className="input" type="date" value={form.data_agendada} onChange={(e) => set('data_agendada', e.target.value)} />
          </div>
          <div>
            <label>Hora agendada</label>
            <input className="input" type="time" value={form.hora_agendada} onChange={(e) => set('hora_agendada', e.target.value)} />
          </div>
        </div>

        <div style={tituloSecao}>Descrição</div>
        <label>Avaria</label>
        <input className="input" value={form.avaria} onChange={(e) => set('avaria', e.target.value)} placeholder="Resumo curto da avaria" />
        <label>Descrição</label>
        <textarea rows={4} value={form.descricao} onChange={(e) => set('descricao', e.target.value)} placeholder="Descreva o problema com detalhes" />
        <label>Observação</label>
        <textarea rows={3} value={form.observacao} onChange={(e) => set('observacao', e.target.value)} placeholder="Informações adicionais (opcional)" />

        <div style={tituloSecao}>Imagens</div>
        <label>Imagens da abertura</label>
        <input className="input" type="file" accept="image/*" multiple onChange={(e) => setArquivos(Array.from(e.target.files || []))} />

        <div className="form-actions">
          <button type="button" className="btn sec" onClick={() => nav('/app/os')}>Cancelar</button>
          <button className="btn" disabled={salvando}>{salvando ? 'Criando...' : 'Criar OS'}</button>
        </div>
      </form>
    </div>
  );
}
