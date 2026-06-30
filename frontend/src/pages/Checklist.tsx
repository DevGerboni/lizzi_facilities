import { CSSProperties, FormEvent, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

interface Categoria { id: number; nome: string; tipo: string; }
interface Modelo { id: number; categoria_id: number; nome: string; status: string; }
interface Item {
  id: number;
  checklist_modelo_id: number;
  descricao: string;
  obrigatorio: boolean;
  exige_foto: boolean;
  exige_observacao: boolean;
  ordem: number;
  status: string;
}

function erro(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function bool(v: unknown): boolean {
  return v === true || v === 'true' || v === 1 || v === '1';
}

const tituloSecao: CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: '.08em',
  color: 'var(--texto-suave)',
  margin: '18px 2px 8px',
};

export default function Checklist() {
  const { isPremium } = useAuth();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [modelos, setModelos] = useState<Modelo[]>([]);
  const [itens, setItens] = useState<Item[]>([]);
  const [modeloId, setModeloId] = useState<number | ''>('');
  const [modeloForm, setModeloForm] = useState<Partial<Modelo>>({ status: 'ativo' });
  const [itemForm, setItemForm] = useState<Partial<Item>>({ status: 'ativo', ordem: 0 });
  const [msg, setMsg] = useState('');
  const [erroMsg, setErroMsg] = useState('');

  async function carregarBase() {
    setErroMsg('');
    const [c, m] = await Promise.all([
      api<Categoria[]>('/cadastros/categorias.php'),
      api<Modelo[]>('/checklist/modelos.php'),
    ]);
    setCategorias(c);
    setModelos(m);
    if (!modeloId && m.length) setModeloId(m[0].id);
  }

  async function carregarItens(id: number | '') {
    if (!id) {
      setItens([]);
      return;
    }
    const data = await api<Item[]>('/checklist/itens.php?checklist_modelo_id=' + id);
    setItens(data.map((i) => ({ ...i, obrigatorio: bool(i.obrigatorio), exige_foto: bool(i.exige_foto), exige_observacao: bool(i.exige_observacao) })));
  }

  useEffect(() => {
    if (isPremium) carregarBase().catch((e) => setErroMsg(erro(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPremium]);

  useEffect(() => {
    if (isPremium) carregarItens(modeloId).catch((e) => setErroMsg(erro(e)));
  }, [modeloId, isPremium]);

  async function executar(fn: () => Promise<void>, sucesso: string) {
    setMsg('');
    setErroMsg('');
    try {
      await fn();
      setMsg(sucesso);
      await carregarBase();
      await carregarItens(modeloId);
    } catch (e) {
      setErroMsg(erro(e));
    }
  }

  async function salvarModelo(e: FormEvent) {
    e.preventDefault();
    const body = {
      id: modeloForm.id,
      nome: (modeloForm.nome || '').trim(),
      categoria_id: Number(modeloForm.categoria_id),
      status: modeloForm.status || 'ativo',
    };
    await executar(async () => {
      if (modeloForm.id) await api('/checklist/modelos.php', { method: 'PUT', body });
      else {
        const criado = await api<{ id: number }>('/checklist/modelos.php', { method: 'POST', body });
        setModeloId(criado.id);
      }
      setModeloForm({ status: 'ativo' });
    }, modeloForm.id ? 'Modelo atualizado.' : 'Modelo criado.');
  }

  async function salvarItem(e: FormEvent) {
    e.preventDefault();
    const body = {
      id: itemForm.id,
      checklist_modelo_id: itemForm.checklist_modelo_id || modeloId,
      descricao: (itemForm.descricao || '').trim(),
      ordem: Number(itemForm.ordem || 0),
      obrigatorio: Boolean(itemForm.obrigatorio),
      exige_foto: Boolean(itemForm.exige_foto),
      exige_observacao: Boolean(itemForm.exige_observacao),
      status: itemForm.status || 'ativo',
    };
    await executar(async () => {
      if (itemForm.id) await api('/checklist/itens.php', { method: 'PUT', body });
      else await api('/checklist/itens.php', { method: 'POST', body });
      setItemForm({ status: 'ativo', ordem: 0 });
    }, itemForm.id ? 'Item atualizado.' : 'Item criado.');
  }

  if (!isPremium) {
    return (
      <div className="card">
        <h2>Checklist</h2>
        <p style={{ color: 'var(--texto-suave)' }}>Checklist por tipo de chamado faz parte do plano Premium.</p>
      </div>
    );
  }

  const modeloSelecionado = modelos.find((m) => m.id === modeloId);

  return (
    <div>
      <div className="titulo-pg">
        <h1>Checklist</h1>
        <button className="btn sec sm" onClick={() => carregarBase().catch((e) => setErroMsg(erro(e)))}>Atualizar</button>
      </div>
      <p style={{ color: 'var(--texto-suave)', margin: '-8px 0 4px', maxWidth: 760 }}>
        É só seguir 2 passos: <b>1)</b> crie um modelo para um <b>tipo de chamado</b> e <b>2)</b> clique no modelo e liste os <b>itens</b> que o técnico vai conferir. Pronto — ao abrir uma OS desse tipo, o checklist aparece sozinho na execução (com campo de foto/observação nos itens que você marcar).
      </p>
      {erroMsg && <div className="msg-erro">{erroMsg}</div>}
      {msg && <div className="msg-ok">{msg}</div>}

      {/* ETAPA 1 — MODELOS */}
      <h2 style={tituloSecao}>1. Modelos de checklist</h2>
      <div className="grid cols2">
        <form className="card" onSubmit={salvarModelo}>
          <h3>{modeloForm.id ? 'Editar modelo' : 'Novo modelo'}</h3>
          <label>Tipo de chamado *</label>
          <select value={modeloForm.categoria_id || ''} onChange={(e) => setModeloForm({ ...modeloForm, categoria_id: Number(e.target.value) })} required>
            <option value="">Selecione</option>
            {categorias.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <label>Nome do modelo *</label>
          <input className="input" value={modeloForm.nome || ''} onChange={(e) => setModeloForm({ ...modeloForm, nome: e.target.value })} required placeholder="Ex.: Inspeção de extintores" />
          <div className="form-actions">
            {modeloForm.id && <button type="button" className="btn sec" onClick={() => setModeloForm({ status: 'ativo' })}>Cancelar</button>}
            <button className="btn">{modeloForm.id ? 'Salvar modelo' : 'Adicionar modelo'}</button>
          </div>
        </form>

        <div className="card">
          <h3>Modelos cadastrados</h3>
          <p style={{ color: 'var(--texto-suave)', fontSize: 13, margin: '0 0 8px' }}>Clique num modelo para ver e editar os itens dele ao lado.</p>
          <div>
            {modelos.map((m) => (
              <div className="linha-lista" key={m.id} onClick={() => setModeloId(m.id)} style={{ cursor: 'pointer', ...(m.id === modeloId ? { background: 'var(--azul-claro)', borderRadius: 8, padding: '10px' } : {}) }}>
                <span>
                  <strong>{m.nome}</strong>{m.id === modeloId ? ' ✓' : ''}
                  <br /><small style={{ color: 'var(--texto-suave)' }}>{categorias.find((c) => c.id === m.categoria_id)?.nome || '-'}</small>
                </span>
                <span className="acoes">
                  <button className="btn sec sm" onClick={(ev) => { ev.stopPropagation(); setModeloForm(m); }}>Editar</button>
                  <button className="btn danger sm" onClick={(ev) => { ev.stopPropagation(); executar(() => api('/checklist/modelos.php?id=' + m.id, { method: 'DELETE' }), 'Modelo excluído.'); }}>Excluir</button>
                </span>
              </div>
            ))}
            {!modelos.length && <p className="vazio">Nenhum modelo ainda. Crie o primeiro no formulário ao lado.</p>}
          </div>
        </div>
      </div>

      {/* ETAPA 2 — ITENS DO MODELO */}
      <h2 style={tituloSecao}>
        2. Itens do checklist
        {modeloSelecionado && <span style={{ fontWeight: 600, textTransform: 'none', letterSpacing: 0, color: 'var(--texto-suave)' }}> — {modeloSelecionado.nome}</span>}
      </h2>

      {!modelos.length ? (
        <div className="card"><p className="vazio">Cadastre um modelo acima para começar a adicionar itens.</p></div>
      ) : (
        <>
          <form className="card" onSubmit={salvarItem}>
            <h3>{itemForm.id ? 'Editar item' : 'Novo item'}</h3>
            <div className="grid cols2">
              <div>
                <label>Modelo *</label>
                <select value={itemForm.checklist_modelo_id || modeloId} onChange={(e) => setItemForm({ ...itemForm, checklist_modelo_id: Number(e.target.value) })} required>
                  <option value="">Selecione</option>
                  {modelos.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
                </select>
              </div>
              <div>
                <label>Ordem</label>
                <input className="input" type="number" value={itemForm.ordem || 0} onChange={(e) => setItemForm({ ...itemForm, ordem: Number(e.target.value) })} />
              </div>
            </div>
            <label>Descrição *</label>
            <input className="input" value={itemForm.descricao || ''} onChange={(e) => setItemForm({ ...itemForm, descricao: e.target.value })} required placeholder="Ex.: Verificar pressão do manômetro" />
            <label style={{ marginTop: 10 }}>Regras de preenchimento</label>
            <div className="check-grid" style={{ marginTop: 4 }}>
              <label className="check-line"><input type="checkbox" checked={Boolean(itemForm.obrigatorio)} onChange={(e) => setItemForm({ ...itemForm, obrigatorio: e.target.checked })} /> Obrigatório</label>
              <label className="check-line"><input type="checkbox" checked={Boolean(itemForm.exige_foto)} onChange={(e) => setItemForm({ ...itemForm, exige_foto: e.target.checked })} /> Exige foto</label>
              <label className="check-line"><input type="checkbox" checked={Boolean(itemForm.exige_observacao)} onChange={(e) => setItemForm({ ...itemForm, exige_observacao: e.target.checked })} /> Exige observação</label>
            </div>
            <div className="form-actions">
              {itemForm.id && <button type="button" className="btn sec" onClick={() => setItemForm({ status: 'ativo', ordem: 0 })}>Cancelar</button>}
              <button className="btn">{itemForm.id ? 'Salvar item' : 'Adicionar item'}</button>
            </div>
          </form>

          <div className="tabela-wrap" style={{ marginTop: 16 }}>
            <table>
              <thead><tr><th>Ordem</th><th>Item</th><th>Regras</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {itens.map((i) => (
                  <tr key={i.id}>
                    <td>{i.ordem}</td>
                    <td><strong>{i.descricao}</strong></td>
                    <td>{[i.obrigatorio && 'obrigatório', i.exige_foto && 'foto', i.exige_observacao && 'observação'].filter(Boolean).join(', ') || '-'}</td>
                    <td><span className="badge">{i.status}</span></td>
                    <td className="acoes">
                      <button className="btn sec sm" onClick={() => setItemForm(i)}>Editar</button>
                      <button className="btn danger sm" onClick={() => executar(() => api('/checklist/itens.php?id=' + i.id, { method: 'DELETE' }), 'Item excluído.')}>Excluir</button>
                    </td>
                  </tr>
                ))}
                {!itens.length && <tr><td colSpan={5} className="vazio">{modeloId ? 'Nenhum item para este modelo. Adicione o primeiro no formulário acima.' : 'Selecione um modelo para ver e adicionar itens.'}</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
