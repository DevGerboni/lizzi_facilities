import { FormEvent, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { dataHora } from '../lib/rotulos';
import { Link } from 'react-router-dom';

interface Material {
  id: number;
  nome: string;
  codigo: string | null;
  unidade_medida: string | null;
  quantidade_atual: string | number;
  valor_unitario: string | number;
  status: string;
}

interface Movimento {
  id: number;
  material_id: number;
  material_nome: string;
  ordem_servico_id: number | null;
  tipo: string;
  quantidade: string | number;
  valor_unitario: string | number;
  valor_total: string | number;
  observacao: string | null;
  created_at: string;
}

function erro(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

// O Postgres devolve numeric como string "1.000"/"0.100"; formatamos em pt-BR
// para não ler "1.000" como mil. Quantidade: até 3 casas, sem zeros à toa.
const num = (v: unknown): number => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const fmtQtd = (v: unknown): string => num(v).toLocaleString('pt-BR', { maximumFractionDigits: 3 });
const fmtMoeda = (v: unknown): string => num(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Unidades de medida (select fixo, em vez de texto livre).
const UNIDADES: { sigla: string; nome: string }[] = [
  { sigla: 'un', nome: 'Unidade' },
  { sigla: 'cx', nome: 'Caixa' },
  { sigla: 'pç', nome: 'Peça' },
  { sigla: 'par', nome: 'Par' },
  { sigla: 'pct', nome: 'Pacote' },
  { sigla: 'rolo', nome: 'Rolo' },
  { sigla: 'm', nome: 'Metro' },
  { sigla: 'm²', nome: 'Metro quadrado' },
  { sigla: 'L', nome: 'Litro' },
  { sigla: 'mL', nome: 'Mililitro' },
  { sigla: 'kg', nome: 'Quilograma' },
  { sigla: 'g', nome: 'Grama' },
];

// Campo de dinheiro: exibe "R$ 20,00" e guarda o número em reais. Cada dígito
// digitado entra como centavo (digita 2000 -> R$ 20,00), padrão de máscara de moeda.
const valorMoeda = (v: unknown): string => 'R$ ' + fmtMoeda(v);
const parseMoedaInput = (raw: string): number => {
  const digitos = raw.replace(/\D/g, '');
  return digitos ? Number(digitos) / 100 : 0;
};

export default function Estoque() {
  const { isPremium } = useAuth();
  const [materiais, setMateriais] = useState<Material[]>([]);
  const [movimentos, setMovimentos] = useState<Movimento[]>([]);
  const [form, setForm] = useState<Partial<Material>>({ status: 'ativo', unidade_medida: 'un', quantidade_atual: 0, valor_unitario: 0 });
  const [mov, setMov] = useState({ material_id: '', tipo: 'entrada', quantidade: '', valor_unitario: '', observacao: '' });
  const [erroMsg, setErroMsg] = useState('');
  const [msg, setMsg] = useState('');

  async function carregar() {
    setErroMsg('');
    const [m, mv] = await Promise.all([
      api<Material[]>('/estoque/materiais.php'),
      api<Movimento[]>('/estoque/movimentacoes.php'),
    ]);
    setMateriais(m);
    setMovimentos(mv);
  }

  useEffect(() => {
    if (isPremium) carregar().catch((e) => setErroMsg(erro(e)));
  }, [isPremium]);

  async function executar(fn: () => Promise<void>, sucesso: string) {
    setErroMsg('');
    setMsg('');
    try {
      await fn();
      setMsg(sucesso);
      await carregar();
    } catch (e) {
      setErroMsg(erro(e));
    }
  }

  async function salvarMaterial(e: FormEvent) {
    e.preventDefault();
    const body = {
      id: form.id,
      nome: (form.nome || '').trim(),
      codigo: form.codigo || null,
      unidade_medida: form.unidade_medida || null,
      quantidade_atual: Math.round(Number(form.quantidade_atual || 0)),
      valor_unitario: Number(form.valor_unitario || 0),
      status: form.status || 'ativo',
    };
    await executar(async () => {
      if (form.id) await api('/estoque/materiais.php', { method: 'PUT', body });
      else await api('/estoque/materiais.php', { method: 'POST', body });
      setForm({ status: 'ativo', unidade_medida: 'un', quantidade_atual: 0, valor_unitario: 0 });
    }, form.id ? 'Material atualizado.' : 'Material criado.');
  }

  async function salvarMovimento(e: FormEvent) {
    e.preventDefault();
    const body = {
      material_id: Number(mov.material_id),
      tipo: mov.tipo,
      quantidade: Math.round(Number(mov.quantidade)),
      ...(mov.valor_unitario !== '' ? { valor_unitario: Number(mov.valor_unitario) } : {}),
      observacao: mov.observacao || null,
    };
    await executar(async () => {
      await api('/estoque/movimentacoes.php', { method: 'POST', body });
      setMov({ material_id: '', tipo: 'entrada', quantidade: '', valor_unitario: '', observacao: '' });
    }, 'Movimentação manual registrada.');
  }

  if (!isPremium) {
    return (
      <div className="card">
        <h2>Estoque</h2>
        <p style={{ color: 'var(--texto-suave)' }}>Controle de materiais e movimentações faz parte do plano Premium.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="titulo-pg">
        <h1>Estoque</h1>
        <button className="btn sec sm" onClick={() => carregar().catch((e) => setErroMsg(erro(e)))}>Atualizar</button>
      </div>
      <p style={{ color: 'var(--texto-suave)', margin: '0 0 12px', fontSize: 14 }}>
        Cadastre materiais, registre compras, ajustes e saídas avulsas. A baixa por OS deve ser feita dentro da própria ordem de serviço.
      </p>
      {erroMsg && <div className="msg-erro">{erroMsg}</div>}
      {msg && <div className="msg-ok">{msg}</div>}

      <div className="grid cols2">
        <form className="card" onSubmit={salvarMaterial}>
          <h3>{form.id ? 'Editar material' : 'Novo material'}</h3>
          <p style={{ color: 'var(--texto-suave)', margin: '0 0 10px', fontSize: 13 }}>
            Cadastre cada item que você controla no estoque. Depois registre entradas, ajustes ou saídas manuais no painel ao lado.
          </p>
          <label>Nome do material *</label>
          <input className="input" value={form.nome || ''} onChange={(e) => setForm({ ...form, nome: e.target.value })} required placeholder="Ex.: Lâmpada LED 9W" />
          <div className="grid cols2">
            <div><label>Código</label><input className="input" value={form.codigo || ''} onChange={(e) => setForm({ ...form, codigo: e.target.value })} placeholder="Opcional" /></div>
            <div>
              <label>Unidade de medida</label>
              <select value={form.unidade_medida || 'un'} onChange={(e) => setForm({ ...form, unidade_medida: e.target.value })}>
                {UNIDADES.map((u) => <option key={u.sigla} value={u.sigla}>{u.nome} ({u.sigla})</option>)}
              </select>
            </div>
            <div><label>{form.id ? 'Saldo atual (use Entrada/Saída para alterar)' : 'Quantidade inicial em estoque'}</label><input className="input" type="number" step="1" min="0" inputMode="numeric" value={form.quantidade_atual ?? ''} onChange={(e) => setForm({ ...form, quantidade_atual: e.target.value.replace(/\D/g, '') })} disabled={Boolean(form.id)} /></div>
            <div><label>Valor unitário</label><input className="input" inputMode="numeric" value={valorMoeda(form.valor_unitario)} onChange={(e) => setForm({ ...form, valor_unitario: parseMoedaInput(e.target.value) })} /></div>
          </div>
          <div className="form-actions">
            {form.id && <button type="button" className="btn sec" onClick={() => setForm({ status: 'ativo', unidade_medida: 'un', quantidade_atual: 0, valor_unitario: 0 })}>Cancelar</button>}
            <button className="btn">{form.id ? 'Salvar material' : 'Adicionar material'}</button>
          </div>
        </form>

        <form className="card" onSubmit={salvarMovimento}>
          <h3>Movimentação manual</h3>
          <p style={{ color: 'var(--texto-suave)', margin: '0 0 10px', fontSize: 13 }}>
            Use para compra, reposição, ajuste de inventário ou saída avulsa. Material usado em OS é lançado na tela da OS.
          </p>
          <label>Material *</label>
          <select value={mov.material_id} onChange={(e) => setMov({ ...mov, material_id: e.target.value })} required>
            <option value="">Selecione</option>
            {materiais.map((m) => <option key={m.id} value={m.id}>{m.nome} ({fmtQtd(m.quantidade_atual)})</option>)}
          </select>
          <div className="grid cols2">
            <div>
              <label>Tipo</label>
              <select value={mov.tipo} onChange={(e) => setMov({ ...mov, tipo: e.target.value })}>
                <option value="entrada">Entrada</option><option value="saida">Saída</option>
              </select>
            </div>
            <div><label>Quantidade *</label><input className="input" type="number" step="1" min="0" inputMode="numeric" value={mov.quantidade} onChange={(e) => setMov({ ...mov, quantidade: e.target.value.replace(/\D/g, '') })} required /></div>
            <div><label>Valor unitário</label><input className="input" type="number" step="0.01" value={mov.valor_unitario} onChange={(e) => setMov({ ...mov, valor_unitario: e.target.value })} placeholder="usa o valor cadastrado se vazio" /></div>
          </div>
          <label>Motivo / observação</label>
          <input className="input" value={mov.observacao} onChange={(e) => setMov({ ...mov, observacao: e.target.value })} placeholder="Ex.: compra, ajuste de inventário, perda, devolução..." />
          <div className="form-actions"><button className="btn">Registrar movimentação manual</button></div>
        </form>
      </div>

      <div className="grid cols2" style={{ marginTop: 16 }}>
        <div className="tabela-wrap">
          <table>
            <thead><tr><th>Material</th><th>Qtd</th><th>Valor</th><th></th></tr></thead>
            <tbody>
              {materiais.map((m) => (
                <tr key={m.id}>
                  <td><strong>{m.nome}</strong><br /><small>{m.codigo || '-'}</small></td>
                  <td><strong style={{ color: num(m.quantidade_atual) <= 0 ? 'var(--erro)' : 'inherit' }}>{fmtQtd(m.quantidade_atual)}</strong> {m.unidade_medida || ''}</td>
                  <td>R$ {fmtMoeda(m.valor_unitario)}</td>
                  <td className="acoes">
                    <button className="btn sec sm" onClick={() => setForm({ ...m, quantidade_atual: num(m.quantidade_atual), valor_unitario: num(m.valor_unitario) })}>Editar</button>
                    <button className="btn danger sm" onClick={() => executar(() => api('/estoque/materiais.php?id=' + m.id, { method: 'DELETE' }), 'Material excluído.')}>Excluir</button>
                  </td>
                </tr>
              ))}
              {!materiais.length && <tr><td colSpan={4} className="vazio">Nenhum material cadastrado.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="tabela-wrap">
          <table>
            <thead><tr><th>Quando</th><th>Material</th><th>Movimento</th><th>Total</th></tr></thead>
            <tbody>
              {movimentos.map((m) => (
                <tr key={m.id}>
                  <td>{dataHora(m.created_at)}</td>
                  <td>{m.material_nome}{m.ordem_servico_id ? <> · <Link to={'/app/os/' + m.ordem_servico_id}>OS #{m.ordem_servico_id}</Link></> : ''}</td>
                  <td><span className="badge" style={{ background: m.tipo === 'entrada' ? '#dcfce7' : '#fee2e2', color: m.tipo === 'entrada' ? '#15803d' : '#b91c1c' }}>{m.tipo === 'entrada' ? '↑ entrada' : '↓ saída'}</span> {fmtQtd(m.quantidade)}</td>
                  <td>R$ {fmtMoeda(m.valor_total)}</td>
                </tr>
              ))}
              {!movimentos.length && <tr><td colSpan={4} className="vazio">Nenhuma movimentação registrada.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
