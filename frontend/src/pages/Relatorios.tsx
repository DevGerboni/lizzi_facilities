import { useEffect, useState } from 'react';
import { api, urlImagem, getToken } from '../lib/api';
import { API_BASE } from '../config';
import { dataHora, rotuloStatus } from '../lib/rotulos';

interface EmpresaRelatorio {
  nome_fantasia?: string | null;
  razao_social?: string | null;
  documento?: string | null;
  logo_url?: string | null;
}
interface RelatorioDados {
  relatorio: string;
  titulo: string;
  descricao: string;
  empresa: EmpresaRelatorio;
  resumo: { total_linhas: number; gerado_em: string };
  colunas: string[];
  linhas: Array<Array<string | number | null>>;
}
interface Unidade { id: number; nome: string; }
interface Tecnico { id: number; nome: string; }

const TIPOS = [
  { id: 'chamados', titulo: 'Relatório de chamados (completo)', desc: 'Todas as OS num único relatório com TODOS os dados: status, local, equipamento, solicitante, técnico, prioridade, agendamento, tempos, imagens, checklist, assinaturas e materiais. Filtre por status para cada estado.' },
  { id: 'horas_tecnico', titulo: 'Horas por técnico', desc: 'Horas trabalhadas, OS atendidas, concluídas e tempo médio por técnico.' },
];

function textoCelula(coluna: string, valor: string | number | null): string {
  if (valor === null || valor === undefined || valor === '') return '-';
  const v = String(valor);
  if (coluna === 'Status') return rotuloStatus(v);
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(v)) return dataHora(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) { const [a, m, d] = v.split('-'); return d + '/' + m + '/' + a; }
  return v;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c] || c));
}

export default function Relatorios() {
  const [relatorio, setRelatorio] = useState('chamados');
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const [status, setStatus] = useState('');
  const [unidadeId, setUnidadeId] = useState('');
  const [tecnicoId, setTecnicoId] = useState('');
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [dados, setDados] = useState<RelatorioDados | null>(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    api<Unidade[]>('/cadastros/unidades.php').then(setUnidades).catch(() => {});
    api<Tecnico[]>('/cadastros/tecnicos.php').then(setTecnicos).catch(() => {});
  }, []);

  function query(): string {
    const qs = new URLSearchParams();
    qs.set('relatorio', relatorio);
    if (de) qs.set('de', de);
    if (ate) qs.set('ate', ate);
    if (status) qs.set('status', status);
    if (unidadeId) qs.set('unidade_id', unidadeId);
    if (tecnicoId) qs.set('tecnico_id', tecnicoId);
    return qs.toString();
  }

  async function gerar() {
    setErro('');
    setCarregando(true);
    try {
      setDados(await api<RelatorioDados>('/os/os_relatorio.php?' + query()));
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { gerar(); }, [relatorio]); // eslint-disable-line react-hooks/exhaustive-deps

  function gerarPdf() {
    if (!dados) return;
    const empresa = dados.empresa?.nome_fantasia || dados.empresa?.razao_social || 'Empresa';
    const logo = dados.empresa?.logo_url ? urlImagem(dados.empresa.logo_url) : '';
    const linhas = dados.linhas.map((linha) => `<tr>${linha.map((v, i) => `<td>${escapeHtml(textoCelula(dados.colunas[i], v))}</td>`).join('')}</tr>`).join('');
    const html = `<!doctype html><html lang="pt-br"><head><meta charset="utf-8"><title>${escapeHtml(dados.titulo)}</title>
      <style>
      *{box-sizing:border-box}body{margin:0;background:#eef4ff;font-family:Segoe UI,Arial,sans-serif;color:#102035;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .bar{position:sticky;top:0;background:#0b1f4d;text-align:center;padding:12px}.bar button{border:0;background:#1e66f5;color:#fff;border-radius:10px;padding:10px 22px;font-weight:800}
      .page{max-width:1120px;margin:24px auto;background:#fff;border-radius:22px;overflow:hidden;box-shadow:0 20px 60px rgba(30,102,245,.16)}
      .hero{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;padding:34px 38px;background:linear-gradient(135deg,#1e66f5,#0a49c2);color:#fff}
      .brand{display:flex;align-items:center;gap:16px}.logo{width:82px;height:82px;object-fit:contain;background:#fff;border-radius:18px;padding:10px}.fallback{width:82px;height:82px;background:#fff;color:#1e66f5;border-radius:18px;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:900}
      h1{margin:0;font-size:30px}.hero p{margin:5px 0;color:#eaf1ff}.meta{text-align:right}.meta span{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:#dce8ff}.meta b{display:block;margin-top:4px}
      .content{padding:28px 38px 38px}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:18px}.card{border:1px solid #dce8ff;border-radius:16px;padding:16px}.card span{display:block;color:#5b6b85;text-transform:uppercase;font-size:11px;font-weight:900}.card b{display:block;color:#1e66f5;font-size:28px;margin-top:5px}
      table{width:100%;border-collapse:collapse;font-size:11.5px}th{background:#0b1f4d;color:#fff;text-align:left;padding:8px;text-transform:uppercase;font-size:10px}td{padding:8px;border-bottom:1px solid #eef2f7;vertical-align:top}tbody tr:nth-child(even){background:#f8fbff}.footer{text-align:center;color:#94a3b8;border-top:1px solid #e5ebf4;margin-top:24px;padding-top:12px;font-size:11px}
      @media print{body{background:#fff}.bar{display:none}.page{box-shadow:none;margin:0;max-width:none;border-radius:0}.content{padding:22px}th,td{padding:5px;font-size:9.5px}.card{break-inside:avoid}}
      </style></head><body><div class="bar"><button onclick="window.print()">Imprimir / salvar PDF</button></div><main class="page">
      <section class="hero"><div class="brand">${logo ? `<img class="logo" src="${escapeHtml(logo)}" alt="">` : `<div class="fallback">${escapeHtml(empresa.slice(0, 2).toUpperCase())}</div>`}<div><h1>${escapeHtml(dados.titulo)}</h1><p>${escapeHtml(empresa)}</p><p>${escapeHtml(dados.descricao)}</p></div></div><div class="meta"><span>Período</span><b>${escapeHtml(de || 'início')} até ${escapeHtml(ate || 'hoje')}</b><span style="margin-top:12px">Linhas</span><b>${dados.resumo.total_linhas}</b></div></section>
      <section class="content"><div class="cards"><div class="card"><span>Relatório</span><b>${escapeHtml(dados.titulo)}</b></div><div class="card"><span>Total de linhas</span><b>${dados.resumo.total_linhas}</b></div><div class="card"><span>Gerado em</span><b>${escapeHtml(dataHora(dados.resumo.gerado_em))}</b></div></div>
      <table><thead><tr>${dados.colunas.map((c) => `<th>${escapeHtml(c)}</th>`).join('')}</tr></thead><tbody>${linhas || `<tr><td colspan="${dados.colunas.length}">Nenhum dado encontrado.</td></tr>`}</tbody></table><div class="footer">Relatório gerado pelo Lizzi Facilities</div></section></main></body></html>`;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.open();
    win.document.write(html);
    win.document.close();
  }

  function baixarCsv() {
    if (!dados) return;
    const esc = (v: string) => (/[";\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v);
    const linhasCsv = [
      dados.colunas.join(';'),
      ...dados.linhas.map((l) => l.map((v, i) => esc(textoCelula(dados.colunas[i], v))).join(';')),
    ];
    const csv = '﻿' + linhasCsv.join('\r\n'); // BOM p/ acentos no Excel
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = (dados.relatorio || 'relatorio') + '.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  // PDF completo (servidor): cada OS com imagens, assinaturas, checklist e histórico.
  async function abrirRelatorioPdf() {
    const win = window.open('', '_blank');
    if (win) win.document.write('Gerando relatório completo...');
    try {
      const res = await fetch(`${API_BASE}/os/os_relatorio_pdf.php?` + query(), { headers: { Authorization: 'Bearer ' + getToken() } });
      if (!res.ok) throw new Error();
      const url = URL.createObjectURL(await res.blob());
      if (win) win.location.href = url; else window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 120000);
    } catch {
      if (win) win.close();
      setErro('Não foi possível gerar o relatório completo.');
    }
  }

  return (
    <div>
      <div className="titulo-pg">
        <h1>Relatórios</h1>
      </div>
      <p style={{ color: 'var(--texto-suave)', margin: '0 0 16px', fontSize: 14 }}>
        Escolha o relatório, ajuste o período/filtros e baixe em CSV (Excel) ou PDF. Os dados não são exibidos aqui — esta é uma área de extração.
      </p>

      <div className="relatorio-tipos">
        {TIPOS.map((t) => (
          <button key={t.id} className={relatorio === t.id ? 'on' : ''} onClick={() => setRelatorio(t.id)}>
            <strong>{t.titulo}</strong>
            <span>{t.desc}</span>
          </button>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="relatorio-filtros">
          <div><label>De</label><input className="input" type="date" value={de} onChange={(e) => setDe(e.target.value)} /></div>
          <div><label>Até</label><input className="input" type="date" value={ate} onChange={(e) => setAte(e.target.value)} /></div>
          <div><label>Status</label><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Todos</option><option value="aberto">Atribuído</option><option value="em_andamento">Em execução</option><option value="interrompido">Interrompido</option><option value="aguardando_aprovacao">Aguardando aprovação do cliente</option><option value="concluido">Concluído</option><option value="cancelado">Cancelado</option></select></div>
          <div><label>Unidade</label><select value={unidadeId} onChange={(e) => setUnidadeId(e.target.value)}><option value="">Todas</option>{unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}</select></div>
          <div><label>Técnico</label><select value={tecnicoId} onChange={(e) => setTecnicoId(e.target.value)}><option value="">Todos</option>{tecnicos.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}</select></div>
          <button className="btn" onClick={gerar} disabled={carregando}>{carregando ? 'Gerando...' : 'Aplicar filtros'}</button>
        </div>
      </div>

      {erro && <div className="msg-erro">{erro}</div>}

      {dados && (
        <div className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            {dados.empresa?.logo_url && <img src={urlImagem(dados.empresa.logo_url)} alt="" style={{ maxHeight: 40, display: 'block', marginBottom: 8 }} />}
            <h2 style={{ margin: '0 0 4px' }}>{dados.titulo}</h2>
            <p style={{ color: 'var(--texto-suave)', margin: '0 0 12px', fontSize: 14 }}>{dados.descricao}</p>
            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 13, color: 'var(--texto-suave)' }}>
              <span><b style={{ color: 'var(--azul)', fontSize: 20 }}>{dados.resumo.total_linhas}</b> registro(s)</span>
              <span>Período: {de || 'início'} → {ate || 'hoje'}</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 210 }}>
            <button type="button" className="btn lg" onClick={baixarCsv} disabled={!dados.linhas.length}>Baixar CSV (Excel)</button>
            <button type="button" className="btn sec lg" onClick={() => (relatorio === 'chamados' ? abrirRelatorioPdf() : gerarPdf())} disabled={!dados.linhas.length}>{relatorio === 'chamados' ? 'PDF completo (com imagens)' : 'Gerar PDF'}</button>
            {!dados.linhas.length && <span className="vazio" style={{ padding: 6, fontSize: 13 }}>Nenhum registro neste filtro.</span>}
          </div>
        </div>
      )}
    </div>
  );
}
