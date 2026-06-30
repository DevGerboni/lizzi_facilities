import { FormEvent, useEffect, useState } from 'react';
import { api, urlImagem, comprimirImagem } from '../lib/api';

interface ConfigEmpresaDados {
  id?: number;
  nome_fantasia?: string | null;
  razao_social?: string | null;
  documento?: string | null;
  endereco?: string | null;
  telefone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  logo_url?: string | null;
  cor_primaria?: string | null;
  cor_secundaria?: string | null;
  whatsapp_numero?: string | null;
  whatsapp_instancia?: string | null;
  whatsapp_ativo?: boolean | string;
}

function erro(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function ativo(v: unknown): boolean {
  return v === true || v === 'true' || v === 1 || v === '1';
}

export default function ConfigEmpresa() {
  const [form, setForm] = useState<ConfigEmpresaDados>({});
  const [logo, setLogo] = useState<File | null>(null);
  const [erroMsg, setErroMsg] = useState('');
  const [msg, setMsg] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    setErroMsg('');
    const cfg = await api<ConfigEmpresaDados>('/config_empresa/configuracoes.php');
    setForm({ ...cfg, whatsapp_ativo: ativo(cfg.whatsapp_ativo), cor_primaria: cfg.cor_primaria || '#1E66F5', cor_secundaria: cfg.cor_secundaria || '#FFFFFF' });
  }

  useEffect(() => {
    carregar().catch((e) => setErroMsg(erro(e)));
  }, []);

  async function subirLogo() {
    if (!logo) return;
    const fd = new FormData();
    fd.append('logo', await comprimirImagem(logo));
    await api('/config_empresa/logo.php', { method: 'POST', body: fd, isForm: true });
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setErroMsg('');
    setMsg('');
    setSalvando(true);
    try {
      await api('/config_empresa/configuracoes.php', { method: 'PUT', body: form });
      await subirLogo();
      setMsg('Configuração atualizada.');
      setLogo(null);
      await carregar();
    } catch (e2) {
      setErroMsg(erro(e2));
    } finally {
      setSalvando(false);
    }
  }

  const set = (k: keyof ConfigEmpresaDados, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  const ajuda = { fontSize: 12, color: 'var(--texto-suave)', margin: '4px 0 0', lineHeight: 1.45 } as const;
  const tituloSecao = { fontSize: 16, margin: '0 0 4px', color: 'var(--texto)' } as const;
  const subSecao = { fontSize: 13, color: 'var(--texto-suave)', margin: '0 0 16px' } as const;
  const espacoCard = { marginBottom: 16 } as const;

  const corRow = (
    rotulo: string,
    chave: 'cor_primaria' | 'cor_secundaria',
    fallback: string,
  ) => (
    <div>
      <label>{rotulo}</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <input
          type="color"
          value={form[chave] || fallback}
          onChange={(e) => set(chave, e.target.value)}
          style={{ width: 52, height: 42, padding: 4, border: '1px solid var(--cinza-borda)', borderRadius: 'var(--raio)', background: '#fff', cursor: 'pointer', flexShrink: 0 }}
        />
        <span style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: 'var(--texto)', textTransform: 'uppercase' }}>
          {(form[chave] || fallback)}
        </span>
      </div>
    </div>
  );

  return (
    <div>
      <div className="titulo-pg">
        <h1>Configuração da empresa</h1>
        <button className="btn sec sm" onClick={() => carregar().catch((e) => setErroMsg(erro(e)))}>Atualizar</button>
      </div>
      {erroMsg && <div className="msg-erro">{erroMsg}</div>}
      {msg && <div className="msg-ok">{msg}</div>}

      <form onSubmit={salvar}>
        {/* ===== Dados da empresa ===== */}
        <div className="card" style={espacoCard}>
          <h3 style={tituloSecao}>Dados da empresa</h3>
          <p style={subSecao}>Informações cadastrais usadas em documentos e contatos.</p>
          <div className="grid cols2">
            <div>
              <label>Nome fantasia</label>
              <input className="input" value={form.nome_fantasia || ''} onChange={(e) => set('nome_fantasia', e.target.value)} />
            </div>
            <div>
              <label>Razão social</label>
              <input className="input" value={form.razao_social || ''} onChange={(e) => set('razao_social', e.target.value)} />
            </div>
            <div>
              <label>Documento</label>
              <input className="input" value={form.documento || ''} onChange={(e) => set('documento', e.target.value)} placeholder="CNPJ / CPF" />
            </div>
            <div>
              <label>E-mail</label>
              <input className="input" type="email" value={form.email || ''} onChange={(e) => set('email', e.target.value)} />
            </div>
            <div>
              <label>Telefone</label>
              <input className="input" value={form.telefone || ''} onChange={(e) => set('telefone', e.target.value)} />
            </div>
            <div>
              <label>WhatsApp de contato</label>
              <input className="input" value={form.whatsapp || ''} onChange={(e) => set('whatsapp', e.target.value)} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label>Endereço</label>
              <input className="input" value={form.endereco || ''} onChange={(e) => set('endereco', e.target.value)} />
            </div>
          </div>
        </div>

        {/* ===== Identidade visual ===== */}
        <div className="card" style={espacoCard}>
          <h3 style={tituloSecao}>Identidade visual</h3>
          <p style={subSecao}>Cores e logotipo aplicados à marca da empresa.</p>
          <div className="grid cols2">
            <div>
              {corRow('Cor primária', 'cor_primaria', '#1E66F5')}
              <p style={ajuda}>Cor principal da marca (ex.: botões e destaques).</p>
            </div>
            <div>
              {corRow('Cor secundária', 'cor_secundaria', '#FFFFFF')}
              <p style={ajuda}>Cor de apoio, usada em fundos e contrastes.</p>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label>Logo</label>
              <input className="input" type="file" accept="image/*" onChange={(e) => setLogo(e.target.files?.[0] || null)} />
              <p style={ajuda}>Envie uma imagem (PNG ou JPG). A logo é salva ao clicar em "Salvar configuração".</p>
              {form.logo_url && (
                <a href={urlImagem(form.logo_url)} target="_blank" rel="noreferrer">
                  <img src={urlImagem(form.logo_url)} alt="Pré-visualização da logo" className="logo-preview" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* ===== WhatsApp / Evolution ===== */}
        <div className="card" style={espacoCard}>
          <h3 style={tituloSecao}>WhatsApp / Evolution</h3>
          <p style={subSecao}>Integração de mensagens via Evolution API / N8N.</p>
          <div className="grid cols2">
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="check-line">
                <input type="checkbox" checked={ativo(form.whatsapp_ativo)} onChange={(e) => set('whatsapp_ativo', e.target.checked)} />
                WhatsApp ativo
              </label>
              <p style={ajuda}>Ative para habilitar o envio de mensagens pela integração.</p>
            </div>
            <div>
              <label>Número de origem WhatsApp</label>
              <input className="input" value={form.whatsapp_numero || ''} onChange={(e) => set('whatsapp_numero', e.target.value)} placeholder="5511999999999" />
              <p style={ajuda}>Número que envia as mensagens, com código do país e DDD.</p>
            </div>
            <div>
              <label>Instância Evolution/N8N</label>
              <input className="input" value={form.whatsapp_instancia || ''} onChange={(e) => set('whatsapp_instancia', e.target.value)} />
              <p style={ajuda}>Nome da instância configurada na Evolution API / fluxo N8N.</p>
            </div>
          </div>
        </div>

        <div className="form-actions">
          <button className="btn" disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar configuração'}</button>
        </div>
      </form>
    </div>
  );
}
