import { FormEvent, useEffect, useState } from 'react';
import { api, urlImagem, comprimirImagem } from '../lib/api';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../lib/auth';

interface Unidade { id: number; nome: string; }
interface Piso { id: number; unidade_id: number; nome: string; }
interface Local { id: number; unidade_id: number; piso_id: number; nome: string; }
interface Categoria { id: number; nome: string; tipo: string; }
interface Ativo {
  id: number;
  unidade_id: number;
  piso_id: number;
  local_id: number;
  categoria_id: number | null;
  nome: string;
  patrimonio: string | null;
  marca: string | null;
  fabricante: string | null;
  modelo: string | null;
  numero_serie: string | null;
  qr_code: string | null;
  foto_url: string | null;
  status: string;
}

function label<T extends { id: number; nome: string }>(lista: T[], id: number | null | undefined): string {
  return lista.find((i) => i.id === Number(id))?.nome || '-';
}

function msgErro(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export default function Ativos() {
  const { isPremium } = useAuth();
  const [ativos, setAtivos] = useState<Ativo[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [pisos, setPisos] = useState<Piso[]>([]);
  const [locais, setLocais] = useState<Local[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [form, setForm] = useState<Partial<Ativo>>({ status: 'ativo' });
  const [foto, setFoto] = useState<File | null>(null);
  const [erro, setErro] = useState('');
  const [msg, setMsg] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [qrAtivo, setQrAtivo] = useState<Ativo | null>(null);
  const qrUrl = (a: Ativo) => window.location.href.split('#')[0] + '#/app/qr/' + a.qr_code;

  const editando = Boolean(form.id);
  const pisosDaUnidade = form.unidade_id ? pisos.filter((p) => p.unidade_id === Number(form.unidade_id)) : pisos;
  const locaisDoPiso = form.piso_id ? locais.filter((l) => l.piso_id === Number(form.piso_id)) : locais;
  const tiposChamado = categorias;

  async function carregar() {
    setErro('');
    const [a, u, p, l, c] = await Promise.all([
      api<Ativo[]>('/ativos/ativos.php'),
      api<Unidade[]>('/cadastros/unidades.php'),
      api<Piso[]>('/cadastros/pisos.php'),
      api<Local[]>('/cadastros/locais.php'),
      api<Categoria[]>('/cadastros/categorias.php'),
    ]);
    setAtivos(a);
    setUnidades(u);
    setPisos(p);
    setLocais(l);
    setCategorias(c);
  }

  useEffect(() => {
    if (isPremium) carregar().catch((e) => setErro(msgErro(e)));
  }, [isPremium]);

  function limpar() {
    setForm({ status: 'ativo' });
    setFoto(null);
  }

  async function subirFoto(id: number, arquivo: File) {
    const fd = new FormData();
    fd.append('id', String(id));
    fd.append('foto', await comprimirImagem(arquivo));
    await api('/ativos/foto.php', { method: 'POST', body: fd, isForm: true });
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setErro('');
    setMsg('');
    setOcupado(true);
    try {
      const body = {
        id: form.id,
        nome: (form.nome || '').trim(),
        unidade_id: Number(form.unidade_id),
        piso_id: Number(form.piso_id),
        local_id: Number(form.local_id),
        categoria_id: form.categoria_id ? Number(form.categoria_id) : null,
        patrimonio: form.patrimonio || null,
        marca: form.marca || null,
        fabricante: form.fabricante || null,
        modelo: form.modelo || null,
        numero_serie: form.numero_serie || null,
        status: form.status || 'ativo',
      };
      let id = form.id;
      if (id) await api('/ativos/ativos.php', { method: 'PUT', body });
      else {
        const criado = await api<{ id: number }>('/ativos/ativos.php', { method: 'POST', body });
        id = criado.id;
      }
      if (foto && id) await subirFoto(Number(id), foto);
      setMsg(editando ? 'Equipamento atualizado.' : 'Equipamento criado.');
      limpar();
      await carregar();
    } catch (e2) {
      setErro(msgErro(e2));
    } finally {
      setOcupado(false);
    }
  }

  async function excluir(id: number) {
    if (!window.confirm('Excluir este equipamento?')) return;
    setErro('');
    setMsg('');
    try {
      await api('/ativos/ativos.php?id=' + id, { method: 'DELETE' });
      setMsg('Equipamento excluído.');
      await carregar();
    } catch (e) {
      setErro(msgErro(e));
    }
  }

  async function fotoLinha(id: number, arquivo: File | null) {
    if (!arquivo) return;
    setErro('');
    setMsg('');
    try {
      await subirFoto(id, arquivo);
      setMsg('Foto atualizada.');
      await carregar();
    } catch (e) {
      setErro(msgErro(e));
    }
  }

  if (!isPremium) {
    return (
      <div className="card">
        <h2>Equipamentos e QR Code</h2>
        <p style={{ color: 'var(--texto-suave)' }}>Cadastro de equipamentos, fotos e QR Code fazem parte do plano Premium.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="titulo-pg">
        <h1>Equipamentos</h1>
        <button className="btn sec sm" onClick={() => carregar().catch((e) => setErro(msgErro(e)))}>Atualizar</button>
      </div>
      {erro && <div className="msg-erro">{erro}</div>}
      {msg && <div className="msg-ok">{msg}</div>}

      <form className="card" onSubmit={salvar} style={{ marginBottom: 16 }}>
        <h3>{editando ? 'Editar equipamento' : 'Novo equipamento'}</h3>

        <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--texto-suave)', margin: '18px 2px 8px' }}>Localização</div>
        <div className="grid cols2">
          <div>
            <label>Unidade *</label>
            <select value={form.unidade_id || ''} onChange={(e) => setForm({ ...form, unidade_id: Number(e.target.value), piso_id: undefined, local_id: undefined })} required>
              <option value="">Selecione</option>
              {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
          </div>
          <div>
            <label>Piso *</label>
            <select value={form.piso_id || ''} onChange={(e) => setForm({ ...form, piso_id: Number(e.target.value), local_id: undefined })} required>
              <option value="">Selecione</option>
              {pisosDaUnidade.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
          <div>
            <label>Local *</label>
            <select value={form.local_id || ''} onChange={(e) => setForm({ ...form, local_id: Number(e.target.value) })} required>
              <option value="">Selecione</option>
              {locaisDoPiso.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
            </select>
          </div>
        </div>

        <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--texto-suave)', margin: '18px 2px 8px' }}>Identificação</div>
        <div className="grid cols2">
          <div>
            <label>Nome *</label>
            <input className="input" value={form.nome || ''} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
          </div>
          <div>
            <label>Tipo de chamado</label>
            <select value={form.categoria_id || ''} onChange={(e) => setForm({ ...form, categoria_id: e.target.value ? Number(e.target.value) : null })}>
              <option value="">Sem tipo de chamado</option>
              {tiposChamado.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </div>
          <div>
            <label>Patrimônio</label>
            <input className="input" value={form.patrimonio || ''} onChange={(e) => setForm({ ...form, patrimonio: e.target.value })} />
          </div>
          <div>
            <label>Marca</label>
            <input className="input" value={form.marca || ''} onChange={(e) => setForm({ ...form, marca: e.target.value })} />
          </div>
          <div>
            <label>Fabricante</label>
            <input className="input" value={form.fabricante || ''} onChange={(e) => setForm({ ...form, fabricante: e.target.value })} />
          </div>
          <div>
            <label>Modelo</label>
            <input className="input" value={form.modelo || ''} onChange={(e) => setForm({ ...form, modelo: e.target.value })} />
          </div>
          <div>
            <label>Número de série</label>
            <input className="input" value={form.numero_serie || ''} onChange={(e) => setForm({ ...form, numero_serie: e.target.value })} />
          </div>
        </div>

        <div style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--texto-suave)', margin: '18px 2px 8px' }}>Foto</div>
        <div className="grid cols2">
          <div>
            <label>Foto do equipamento</label>
            <input className="input" type="file" accept="image/*" onChange={(e) => setFoto(e.target.files?.[0] || null)} />
          </div>
          <div>
            {foto && <img src={URL.createObjectURL(foto)} alt="" className="thumb" style={{ marginTop: 22 }} />}
          </div>
        </div>

        <div className="form-actions">
          {editando && <button type="button" className="btn sec" onClick={limpar}>Cancelar</button>}
          <button className="btn" disabled={ocupado}>{ocupado ? 'Salvando...' : (editando ? 'Salvar equipamento' : 'Adicionar equipamento')}</button>
        </div>
      </form>

      <div className="tabela-wrap">
        <table>
          <thead><tr><th>Equipamento</th><th>Localização</th><th>Tipo de chamado</th><th>QR</th><th>Foto</th><th></th></tr></thead>
          <tbody>
            {ativos.map((a) => (
              <tr key={a.id}>
                <td><strong>{a.nome}</strong><br /><small>{a.patrimonio || a.marca || a.modelo || '-'}</small></td>
                <td>{label(unidades, a.unidade_id)} / {label(pisos, a.piso_id)} / {label(locais, a.local_id)}</td>
                <td>{label(tiposChamado, a.categoria_id)}</td>
                <td><code>{a.qr_code || '-'}</code></td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
                    {a.foto_url ? <a href={urlImagem(a.foto_url)} target="_blank" rel="noreferrer"><img src={urlImagem(a.foto_url)} alt="" className="thumb" /></a> : <span style={{ color: 'var(--texto-suave)' }}>-</span>}
                    <input className="input mini-file" type="file" accept="image/*" onChange={(e) => fotoLinha(a.id, e.target.files?.[0] || null)} />
                  </div>
                </td>
                <td className="acoes">
                  {a.qr_code && <button className="btn sm" onClick={() => setQrAtivo(a)}>QR</button>}
                  <button className="btn sec sm" onClick={() => setForm(a)}>Editar</button>
                  <button className="btn danger sm" onClick={() => excluir(a.id)}>Excluir</button>
                </td>
              </tr>
            ))}
            {!ativos.length && <tr><td colSpan={6} className="vazio">Nenhum equipamento cadastrado.</td></tr>}
          </tbody>
        </table>
      </div>

      {qrAtivo && (
        <div className="modal-bg" onClick={() => setQrAtivo(null)}>
          <div className="modal qr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="qr-print">
              <h3 style={{ margin: 0 }}>{qrAtivo.nome}</h3>
              <QRCodeSVG value={qrUrl(qrAtivo)} size={220} includeMargin />
              <div style={{ fontFamily: 'monospace', fontWeight: 700 }}>{qrAtivo.qr_code}</div>
            </div>
            <div className="form-actions">
              <button className="btn sec" onClick={() => setQrAtivo(null)}>Fechar</button>
              <button className="btn" onClick={() => window.print()}>Imprimir etiqueta</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
