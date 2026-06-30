import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { api } from '../lib/api';

interface Unidade { id: number; nome: string; endereco: string | null; status: string; }
interface Piso { id: number; unidade_id: number; nome: string; status: string; }
interface Local { id: number; unidade_id: number; piso_id: number; nome: string; status: string; }
interface Categoria { id: number; nome: string; tipo: string; status: string; }
interface Tecnico {
  id: number; nome: string; email: string; telefone: string | null; whatsapp: string | null; status: string; unidades: number[];
}

type Aba = 'unidades' | 'pisos' | 'locais' | 'tipos_chamado' | 'tecnicos';

const ABAS: Array<{ id: Aba; label: string }> = [
  { id: 'unidades', label: 'Unidades' },
  { id: 'pisos', label: 'Pisos' },
  { id: 'locais', label: 'Locais' },
  { id: 'tipos_chamado', label: 'Tipos de chamado' },
  { id: 'tecnicos', label: 'Técnicos' },
];

function erroMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function nomeUnidade(lista: Unidade[], id: number): string {
  return lista.find((u) => u.id === Number(id))?.nome || '-';
}

function nomePiso(lista: Piso[], id: number): string {
  return lista.find((p) => p.id === Number(id))?.nome || '-';
}

export default function Cadastros() {
  const [aba, setAba] = useState<Aba>('unidades');
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [pisos, setPisos] = useState<Piso[]>([]);
  const [locais, setLocais] = useState<Local[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [erro, setErro] = useState('');
  const [msg, setMsg] = useState('');

  async function carregar() {
    setErro('');
    const [u, p, l, c, t] = await Promise.all([
      api<Unidade[]>('/cadastros/unidades.php'),
      api<Piso[]>('/cadastros/pisos.php'),
      api<Local[]>('/cadastros/locais.php'),
      api<Categoria[]>('/cadastros/categorias.php'),
      api<Tecnico[]>('/cadastros/tecnicos.php'),
    ]);
    setUnidades(u);
    setPisos(p);
    setLocais(l);
    setCategorias(c);
    setTecnicos(t);
  }

  useEffect(() => {
    carregar().catch((e) => setErro(erroMsg(e)));
  }, []);

  async function executar(fn: () => Promise<void>, sucesso: string) {
    setErro('');
    setMsg('');
    try {
      await fn();
      setMsg(sucesso);
      await carregar();
    } catch (e) {
      setErro(erroMsg(e));
    }
  }

  return (
    <div>
      <div className="titulo-pg">
        <h1>Cadastros</h1>
        <button className="btn sec sm" onClick={() => carregar().catch((e) => setErro(erroMsg(e)))}>Atualizar</button>
      </div>

      <div className="tabs" style={{ marginBottom: 14 }}>
        {ABAS.map((t) => (
          <button key={t.id} className={aba === t.id ? 'on' : ''} onClick={() => setAba(t.id)}>{t.label}</button>
        ))}
      </div>

      {erro && <div className="msg-erro">{erro}</div>}
      {msg && <div className="msg-ok">{msg}</div>}

      {aba === 'unidades' && <UnidadesSecao lista={unidades} executar={executar} />}
      {aba === 'pisos' && <PisosSecao lista={pisos} unidades={unidades} executar={executar} />}
      {aba === 'locais' && <LocaisSecao lista={locais} unidades={unidades} pisos={pisos} executar={executar} />}
      {aba === 'tipos_chamado' && (
        <CategoriasSecao
          lista={categorias}
          executar={executar}
          tipo="chamado"
          tituloNovo="Novo tipo de chamado"
          tituloEditar="Editar tipo de chamado"
          labelNome="Tipo de chamado *"
          placeholder="Ex.: Corretivo, Preventivo"
          colunaNome="Tipo de chamado"
          vazio="Nenhum tipo de chamado cadastrado."
          sucessoCriar="Tipo de chamado criado."
          sucessoEditar="Tipo de chamado atualizado."
          sucessoExcluir="Tipo de chamado excluido."
        />
      )}
      {aba === 'tecnicos' && <TecnicosSecao lista={tecnicos} unidades={unidades} executar={executar} />}
    </div>
  );
}

function UnidadesSecao({ lista, executar }: { lista: Unidade[]; executar: (fn: () => Promise<void>, s: string) => Promise<void> }) {
  const [form, setForm] = useState<Partial<Unidade>>({});
  const editando = Boolean(form.id);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    const body = { id: form.id, nome: (form.nome || '').trim(), endereco: form.endereco || null, status: form.status || 'ativo' };
    await executar(async () => {
      if (form.id) await api('/cadastros/unidades.php', { method: 'PUT', body });
      else await api('/cadastros/unidades.php', { method: 'POST', body });
      setForm({});
    }, editando ? 'Unidade atualizada.' : 'Unidade criada.');
  }

  return (
    <div className="grid cols2">
      <form className="card" onSubmit={salvar}>
        <h3>{editando ? 'Editar unidade' : 'Nova unidade'}</h3>
        <label>Nome *</label>
        <input className="input" value={form.nome || ''} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
        <label>Endereço</label>
        <input className="input" value={form.endereco || ''} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />
        <label>Status</label>
        <select value={form.status || 'ativo'} onChange={(e) => setForm({ ...form, status: e.target.value })}>
          <option value="ativo">Ativo</option><option value="inativo">Inativo</option>
        </select>
        <div className="form-actions">
          {editando && <button type="button" className="btn sec" onClick={() => setForm({})}>Cancelar</button>}
          <button className="btn">{editando ? 'Salvar unidade' : 'Adicionar unidade'}</button>
        </div>
      </form>
      <Tabela colunas={['Nome', 'Endereço', 'Status', '']}>
        {lista.map((u) => (
          <tr key={u.id}>
            <td><strong>{u.nome}</strong></td>
            <td>{u.endereco || '-'}</td>
            <td><span className="badge">{u.status}</span></td>
            <td className="acoes">
              <button className="btn sec sm" onClick={() => setForm(u)}>Editar</button>
              <button className="btn danger sm" onClick={() => executar(() => api('/cadastros/unidades.php?id=' + u.id, { method: 'DELETE' }), 'Unidade excluída.')}>Excluir</button>
            </td>
          </tr>
        ))}
        {!lista.length && <tr><td colSpan={4} className="vazio">Nenhuma unidade cadastrada.</td></tr>}
      </Tabela>
    </div>
  );
}

function PisosSecao({ lista, unidades, executar }: { lista: Piso[]; unidades: Unidade[]; executar: (fn: () => Promise<void>, s: string) => Promise<void> }) {
  const [form, setForm] = useState<Partial<Piso>>({});
  const editando = Boolean(form.id);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    const body = { id: form.id, nome: (form.nome || '').trim(), unidade_id: Number(form.unidade_id), status: form.status || 'ativo' };
    await executar(async () => {
      if (form.id) await api('/cadastros/pisos.php', { method: 'PUT', body });
      else await api('/cadastros/pisos.php', { method: 'POST', body });
      setForm({});
    }, editando ? 'Piso atualizado.' : 'Piso criado.');
  }

  return (
    <div className="grid cols2">
      <form className="card" onSubmit={salvar}>
        <h3>{editando ? 'Editar piso' : 'Novo piso'}</h3>
        <label>Unidade *</label>
        <select value={form.unidade_id || ''} onChange={(e) => setForm({ ...form, unidade_id: Number(e.target.value) })} required>
          <option value="">Selecione</option>
          {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
        </select>
        <label>Nome *</label>
        <input className="input" value={form.nome || ''} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
        <label>Status</label>
        <select value={form.status || 'ativo'} onChange={(e) => setForm({ ...form, status: e.target.value })}>
          <option value="ativo">Ativo</option><option value="inativo">Inativo</option>
        </select>
        <div className="form-actions">
          {editando && <button type="button" className="btn sec" onClick={() => setForm({})}>Cancelar</button>}
          <button className="btn">{editando ? 'Salvar piso' : 'Adicionar piso'}</button>
        </div>
      </form>
      <Tabela colunas={['Piso', 'Unidade', 'Status', '']}>
        {lista.map((p) => (
          <tr key={p.id}>
            <td><strong>{p.nome}</strong></td>
            <td>{nomeUnidade(unidades, p.unidade_id)}</td>
            <td><span className="badge">{p.status}</span></td>
            <td className="acoes">
              <button className="btn sec sm" onClick={() => setForm(p)}>Editar</button>
              <button className="btn danger sm" onClick={() => executar(() => api('/cadastros/pisos.php?id=' + p.id, { method: 'DELETE' }), 'Piso excluído.')}>Excluir</button>
            </td>
          </tr>
        ))}
        {!lista.length && <tr><td colSpan={4} className="vazio">Nenhum piso cadastrado.</td></tr>}
      </Tabela>
    </div>
  );
}

function LocaisSecao({ lista, unidades, pisos, executar }: { lista: Local[]; unidades: Unidade[]; pisos: Piso[]; executar: (fn: () => Promise<void>, s: string) => Promise<void> }) {
  const [form, setForm] = useState<Partial<Local>>({});
  const editando = Boolean(form.id);
  const pisosDaUnidade = form.unidade_id ? pisos.filter((p) => p.unidade_id === Number(form.unidade_id)) : pisos;

  async function salvar(e: FormEvent) {
    e.preventDefault();
    const body = {
      id: form.id,
      nome: (form.nome || '').trim(),
      unidade_id: Number(form.unidade_id),
      piso_id: Number(form.piso_id),
      status: form.status || 'ativo',
    };
    await executar(async () => {
      if (form.id) await api('/cadastros/locais.php', { method: 'PUT', body });
      else await api('/cadastros/locais.php', { method: 'POST', body });
      setForm({});
    }, editando ? 'Local atualizado.' : 'Local criado.');
  }

  return (
    <div className="grid cols2">
      <form className="card" onSubmit={salvar}>
        <h3>{editando ? 'Editar local' : 'Novo local'}</h3>
        <label>Unidade *</label>
        <select value={form.unidade_id || ''} onChange={(e) => setForm({ ...form, unidade_id: Number(e.target.value), piso_id: undefined })} required>
          <option value="">Selecione</option>
          {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
        </select>
        <label>Piso *</label>
        <select value={form.piso_id || ''} onChange={(e) => setForm({ ...form, piso_id: Number(e.target.value) })} required>
          <option value="">Selecione</option>
          {pisosDaUnidade.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
        <label>Nome *</label>
        <input className="input" value={form.nome || ''} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
        <label>Status</label>
        <select value={form.status || 'ativo'} onChange={(e) => setForm({ ...form, status: e.target.value })}>
          <option value="ativo">Ativo</option><option value="inativo">Inativo</option>
        </select>
        <div className="form-actions">
          {editando && <button type="button" className="btn sec" onClick={() => setForm({})}>Cancelar</button>}
          <button className="btn">{editando ? 'Salvar local' : 'Adicionar local'}</button>
        </div>
      </form>
      <Tabela colunas={['Local', 'Unidade', 'Piso', 'Status', '']}>
        {lista.map((l) => (
          <tr key={l.id}>
            <td><strong>{l.nome}</strong></td>
            <td>{nomeUnidade(unidades, l.unidade_id)}</td>
            <td>{nomePiso(pisos, l.piso_id)}</td>
            <td><span className="badge">{l.status}</span></td>
            <td className="acoes">
              <button className="btn sec sm" onClick={() => setForm(l)}>Editar</button>
              <button className="btn danger sm" onClick={() => executar(() => api('/cadastros/locais.php?id=' + l.id, { method: 'DELETE' }), 'Local excluído.')}>Excluir</button>
            </td>
          </tr>
        ))}
        {!lista.length && <tr><td colSpan={5} className="vazio">Nenhum local cadastrado.</td></tr>}
      </Tabela>
    </div>
  );
}

function CategoriasSecao({
  lista,
  executar,
  tipo,
  tituloNovo,
  tituloEditar,
  labelNome,
  placeholder,
  colunaNome,
  vazio,
  sucessoCriar,
  sucessoEditar,
  sucessoExcluir,
}: {
  lista: Categoria[];
  executar: (fn: () => Promise<void>, s: string) => Promise<void>;
  tipo: 'ativo' | 'chamado';
  tituloNovo: string;
  tituloEditar: string;
  labelNome: string;
  placeholder: string;
  colunaNome: string;
  vazio: string;
  sucessoCriar: string;
  sucessoEditar: string;
  sucessoExcluir: string;
}) {
  const itens = lista;
  const [form, setForm] = useState<Partial<Categoria>>({ tipo });
  const editando = Boolean(form.id);

  async function salvar(e: FormEvent) {
    e.preventDefault();
    const body = { id: form.id, nome: (form.nome || '').trim(), tipo, status: form.status || 'ativo' };
    await executar(async () => {
      if (form.id) await api('/cadastros/categorias.php', { method: 'PUT', body });
      else await api('/cadastros/categorias.php', { method: 'POST', body });
      setForm({ tipo });
    }, editando ? sucessoEditar : sucessoCriar);
  }

  return (
    <div className="grid cols2">
      <form className="card" onSubmit={salvar}>
        <h3>{editando ? tituloEditar : tituloNovo}</h3>
        <label>{labelNome}</label>
        <input className="input" value={form.nome || ''} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder={placeholder} required />
        <label>Status</label>
        <select value={form.status || 'ativo'} onChange={(e) => setForm({ ...form, status: e.target.value })}>
          <option value="ativo">Ativo</option><option value="inativo">Inativo</option>
        </select>
        <div className="form-actions">
          {editando && <button type="button" className="btn sec" onClick={() => setForm({ tipo })}>Cancelar</button>}
          <button className="btn">{editando ? 'Salvar' : 'Adicionar'}</button>
        </div>
      </form>
      <Tabela colunas={[colunaNome, 'Status', '']}>
        {itens.map((c) => (
          <tr key={c.id}>
            <td><strong>{c.nome}</strong></td>
            <td><span className="badge">{c.status}</span></td>
            <td className="acoes">
              <button className="btn sec sm" onClick={() => setForm(c)}>Editar</button>
              <button className="btn danger sm" onClick={() => executar(() => api('/cadastros/categorias.php?id=' + c.id, { method: 'DELETE' }), sucessoExcluir)}>Excluir</button>
            </td>
          </tr>
        ))}
        {!itens.length && <tr><td colSpan={3} className="vazio">{vazio}</td></tr>}
      </Tabela>
    </div>
  );
}

function TecnicosSecao({ lista, unidades, executar }: { lista: Tecnico[]; unidades: Unidade[]; executar: (fn: () => Promise<void>, s: string) => Promise<void> }) {
  const [form, setForm] = useState<Partial<Tecnico> & { senha?: string }>({});
  const [selecionadas, setSelecionadas] = useState<number[]>([]);
  const editando = Boolean(form.id);

  function alternarUnidade(id: number) {
    setSelecionadas((atuais) => atuais.includes(id) ? atuais.filter((u) => u !== id) : [...atuais, id]);
  }

  function editar(t: Tecnico) {
    setForm({ ...t, senha: '' });
    setSelecionadas(t.unidades || []);
  }

  function limpar() {
    setForm({});
    setSelecionadas([]);
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    const body: Record<string, unknown> = {
      id: form.id,
      nome: (form.nome || '').trim(),
      telefone: form.telefone || null,
      whatsapp: form.whatsapp || null,
      status: form.status || 'ativo',
      unidades: selecionadas,
    };
    if (!editando) {
      body.email = (form.email || '').trim();
      body.senha = form.senha || '';
    } else if (form.senha) {
      body.senha = form.senha;
    }
    await executar(async () => {
      if (form.id) await api('/cadastros/tecnicos.php', { method: 'PUT', body });
      else await api('/cadastros/tecnicos.php', { method: 'POST', body });
      limpar();
    }, editando ? 'Técnico atualizado.' : 'Técnico criado.');
  }

  return (
    <div className="grid cols2">
      <form className="card" onSubmit={salvar}>
        <h3>{editando ? 'Editar técnico' : 'Novo técnico'}</h3>
        <label>Nome *</label>
        <input className="input" value={form.nome || ''} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
        <label>E-mail *</label>
        <input className="input" type="email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={editando} required={!editando} />
        <div className="grid cols2">
          <div><label>Telefone</label><input className="input" value={form.telefone || ''} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
          <div><label>WhatsApp</label><input className="input" value={form.whatsapp || ''} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} /></div>
        </div>
        <label>{editando ? 'Nova senha (opcional)' : 'Senha *'}</label>
        <input className="input" type="password" value={form.senha || ''} onChange={(e) => setForm({ ...form, senha: e.target.value })} required={!editando} />
        <label>Unidades atendidas</label>
        <div className="check-grid">
          {unidades.map((u) => (
            <label key={u.id} className="check-line">
              <input type="checkbox" checked={selecionadas.includes(u.id)} onChange={() => alternarUnidade(u.id)} />
              {u.nome}
            </label>
          ))}
        </div>
        <div className="form-actions">
          {editando && <button type="button" className="btn sec" onClick={limpar}>Cancelar</button>}
          <button className="btn">{editando ? 'Salvar técnico' : 'Adicionar técnico'}</button>
        </div>
      </form>
      <Tabela colunas={['Técnico', 'Contato', 'Unidades', 'Status', '']}>
        {lista.map((t) => (
          <tr key={t.id}>
            <td><strong>{t.nome}</strong><br /><small>{t.email}</small></td>
            <td>{t.whatsapp || t.telefone || '-'}</td>
            <td>{(t.unidades || []).map((id) => nomeUnidade(unidades, id)).join(', ') || '-'}</td>
            <td><span className="badge">{t.status}</span></td>
            <td className="acoes">
              <button className="btn sec sm" onClick={() => editar(t)}>Editar</button>
              <button className="btn danger sm" onClick={() => executar(() => api('/cadastros/tecnicos.php?id=' + t.id, { method: 'DELETE' }), 'Técnico excluído.')}>Excluir</button>
            </td>
          </tr>
        ))}
        {!lista.length && <tr><td colSpan={5} className="vazio">Nenhum técnico cadastrado.</td></tr>}
      </Tabela>
    </div>
  );
}

function Tabela({ colunas, children }: { colunas: string[]; children: ReactNode }) {
  return (
    <div className="tabela-wrap">
      <table>
        <thead><tr>{colunas.map((c) => <th key={c}>{c}</th>)}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
