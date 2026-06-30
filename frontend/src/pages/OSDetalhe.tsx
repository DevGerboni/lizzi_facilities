import { useEffect, useState, FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { useParams, Link } from 'react-router-dom';
import { api, urlImagem, comprimirImagem, getToken } from '../lib/api';
import { API_BASE } from '../config';
import { rotuloStatus, rotuloPrioridade, rotuloTipo, dataHora } from '../lib/rotulos';
import { useAuth } from '../lib/auth';
import Loading from '../components/Loading';
import AssinaturaPad from '../components/AssinaturaPad';

interface Historico {
  id: number; acao: string; status_anterior: string | null; status_novo: string | null; created_at: string;
}
interface ImagemOS {
  id: number; imagem_url: string; tipo: string; created_at: string;
}
interface ChecklistResp {
  id: number; checklist_item_id: number; descricao: string; marcado: boolean | string; observacao: string | null; imagem_url: string | null;
}
interface ChecklistItem {
  id: number;
  descricao: string;
  obrigatorio: boolean | string;
  exige_foto: boolean | string;
  exige_observacao: boolean | string;
  ordem: number;
}
interface ChecklistModelo {
  id: number;
  nome: string;
  itens: ChecklistItem[];
}
interface MaterialUso {
  id: number; material_nome: string; tipo: string; quantidade: string | number; valor_unitario: string | number; valor_total: string | number; created_at: string;
}
interface MaterialCatalogo {
  id: number; nome: string; valor_unitario: string | number;
}
interface UsuarioOpt { id: number; nome: string; perfil?: string }
interface OSDetalheData {
  id: number; codigo: string; status: string; tipo_os: string; prioridade: string;
  ativo_id: number | null; ativo_categoria_id: number | null;
  tecnico_id: number | null; data_agendada: string | null; hora_agendada: string | null;
  unidade_nome: string; piso_nome: string; local_nome: string; ativo_nome: string | null;
  solicitante_nome: string | null; tecnico_nome: string | null;
  avaria: string | null; descricao: string | null; observacao: string | null; tempo_total_minutos: number | null;
  assinatura_tecnico_url: string | null; assinatura_cliente_url: string | null;
  historico: Historico[];
  imagens: ImagemOS[];
  checklist: ChecklistResp[];
  materiais: MaterialUso[];
}

function marcado(v: boolean | string): boolean {
  return v === true || v === 'true' || v === '1';
}

const ESTADOS_VISIVEIS = ['aberto', 'em_andamento', 'interrompido', 'aguardando_aprovacao', 'concluido', 'cancelado'];

function podeMudarEstado(atual: string, destino: string): boolean {
  if (atual === destino) return false;
  if (['concluido', 'cancelado'].includes(atual)) return false;
  if (destino === 'cancelado') return true;
  if (atual === 'aberto') return destino === 'em_andamento';
  if (atual === 'em_andamento') return ['interrompido', 'aguardando_aprovacao', 'concluido'].includes(destino);
  if (atual === 'interrompido') return destino === 'em_andamento';
  if (atual === 'aguardando_aprovacao') return destino === 'aberto';
  return false;
}

function rotuloBotaoEstado(atual: string, destino: string): string {
  if (atual === destino) return rotuloStatus(destino);
  if (destino === 'em_andamento') return atual === 'aberto' ? 'Iniciar' : 'Retomar';
  if (destino === 'interrompido') return 'Pausar';
  if (destino === 'aguardando_aprovacao') return 'Enviar p/ aprovação';
  if (atual === 'aguardando_aprovacao' && destino === 'aberto') return 'Agendar novamente';
  if (destino === 'concluido') return 'Concluir';
  if (destino === 'cancelado') return 'Cancelar';
  return rotuloStatus(destino);
}

export default function OSDetalhe() {
  const { id } = useParams();
  const { isPremium, user } = useAuth();
  const [os, setOs] = useState<OSDetalheData | null>(null);
  const [erro, setErro] = useState('');
  const [msg, setMsg] = useState('');
  const [tipoImagem, setTipoImagem] = useState('execucao');
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [enviandoImagem, setEnviandoImagem] = useState(false);
  const [checklistModelos, setChecklistModelos] = useState<ChecklistModelo[]>([]);
  const [checklistRespostas, setChecklistRespostas] = useState<Record<number, { marcado: boolean; observacao: string; imagem_url: string }>>({});
  const [checklistArquivos, setChecklistArquivos] = useState<Record<number, File | null>>({});
  const [salvandoChecklist, setSalvandoChecklist] = useState(false);
  const [materiaisCatalogo, setMateriaisCatalogo] = useState<MaterialCatalogo[]>([]);
  const [matForm, setMatForm] = useState({ material_id: '', novoNome: '', quantidade: '', valor_unitario: '' });
  const [salvandoMaterial, setSalvandoMaterial] = useState(false);
  const [usuarios, setUsuarios] = useState<UsuarioOpt[]>([]);
  const [agendarAberto, setAgendarAberto] = useState(false);
  const [ag, setAg] = useState({ data_agendada: '', hora_agendada: '', tecnico_id: '' });
  const [salvandoAgenda, setSalvandoAgenda] = useState(false);
  const [confirma, setConfirma] = useState<{ titulo: string; linhas: string[]; rotulo: string; cor: string; acao: () => void } | null>(null);

  async function carregar() {
    setErro('');
    try {
      const data = await api<OSDetalheData>('/os/os_detalhe.php?id=' + id);
      setOs(data);
      aplicarRespostas(data.checklist || []);
    }
    catch (e) { setErro(e instanceof Error ? e.message : String(e)); }
  }
  useEffect(() => { carregar(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isPremium || !os) {
      setChecklistModelos([]);
      return;
    }
    // checklist da OS: pela categoria do equipamento E pelo tipo de chamado
    api<ChecklistModelo[]>('/checklist/por_os.php?os_id=' + os.id)
      .then(setChecklistModelos)
      .catch(() => setChecklistModelos([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPremium, os?.id, os?.tipo_os, os?.ativo_categoria_id]);

  // Catálogo de materiais (liberado em todos os planos) para adicionar à OS.
  useEffect(() => {
    api<MaterialCatalogo[]>('/estoque/materiais.php').then(setMateriaisCatalogo).catch(() => {});
  }, []);

  // Usuários (para agendar/atribuir o chamado a alguém).
  useEffect(() => {
    api<UsuarioOpt[]>('/usuarios/usuarios.php').then(setUsuarios).catch(() => {});
  }, []);

  function aplicarRespostas(respostas: ChecklistResp[]) {
    const mapa: Record<number, { marcado: boolean; observacao: string; imagem_url: string }> = {};
    respostas.forEach((r) => {
      mapa[r.checklist_item_id] = { marcado: marcado(r.marcado), observacao: r.observacao || '', imagem_url: r.imagem_url || '' };
    });
    setChecklistRespostas(mapa);
    setChecklistArquivos({});
  }

  function setResposta(itemId: number, patch: Partial<{ marcado: boolean; observacao: string; imagem_url: string }>) {
    setChecklistRespostas((atuais) => ({
      ...atuais,
      [itemId]: { ...(atuais[itemId] || { marcado: false, observacao: '', imagem_url: '' }), ...patch },
    }));
  }

  async function executarStatus(status: string) {
    setMsg(''); setErro('');
    try { await api('/os/os_atualizar_status.php', { method: 'POST', body: { id: Number(id), status } }); carregar(); }
    catch (e) { setErro(e instanceof Error ? e.message : String(e)); }
  }
  function mudarStatus(status: string) {
    if (status === 'concluido') {
      setConfirma({
        titulo: 'Concluir ordem de serviço',
        linhas: [
          'Ao confirmar, o atendimento será dado como FINALIZADO e a OS ficará travada:',
          '•  o status não poderá mais ser alterado;',
          '•  não dá para anexar/excluir fotos, materiais ou checklist;',
          '•  ficará disponível apenas para consulta e impressão (PDF).',
          'Ação definitiva — confirme com o cliente antes de prosseguir.',
        ],
        rotulo: 'Concluir OS',
        cor: 'var(--ok)',
        acao: () => executarStatus('concluido'),
      });
      return;
    }
    if (status === 'cancelado') {
      setConfirma({
        titulo: 'Cancelar ordem de serviço',
        linhas: [
          'O chamado será encerrado sem execução e ficará travado (somente consulta).',
          'Esta ação é definitiva e não pode ser desfeita.',
        ],
        rotulo: 'Cancelar OS',
        cor: 'var(--erro)',
        acao: () => executarStatus('cancelado'),
      });
      return;
    }
    executarStatus(status);
  }
  function abrirAgendar() {
    if (!os) return;
    setAg({
      data_agendada: os.data_agendada || '',
      hora_agendada: os.hora_agendada ? String(os.hora_agendada).slice(0, 5) : '',
      tecnico_id: os.tecnico_id ? String(os.tecnico_id) : '',
    });
    setAgendarAberto(true);
  }
  function acaoEstado(estado: string) {
    if (os && os.status === 'aguardando_aprovacao' && estado === 'aberto') { abrirAgendar(); return; }
    mudarStatus(estado);
  }
  async function salvarAgendamento(e: FormEvent) {
    e.preventDefault();
    setMsg(''); setErro('');
    setSalvandoAgenda(true);
    try {
      await api('/os/os_agendar.php', { method: 'POST', body: {
        ordem_servico_id: Number(id),
        data_agendada: ag.data_agendada || null,
        hora_agendada: ag.hora_agendada || null,
        tecnico_id: ag.tecnico_id ? Number(ag.tecnico_id) : null,
      } });
      setAgendarAberto(false);
      setMsg('Agendamento salvo.');
      await carregar();
    } catch (e2) {
      setErro(e2 instanceof Error ? e2.message : String(e2));
    } finally {
      setSalvandoAgenda(false);
    }
  }
  async function enviarWhatsapp(tipo: 'tecnico' | 'cliente') {
    setMsg(''); setErro('');
    try { await api('/os/os_enviar_whatsapp.php', { method: 'POST', body: { ordem_servico_id: Number(id), tipo } }); setMsg('WhatsApp enviado!'); }
    catch (e) { setErro(e instanceof Error ? e.message : String(e)); }
  }

  async function salvarAssinatura(tipo: 'tecnico' | 'cliente', arquivo: File) {
    setMsg('');
    setErro('');
    const fd = new FormData();
    fd.append('ordem_servico_id', String(id));
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
  // Abre o documento da OS autenticado: o link direto não envia o token (header
  // Authorization), então buscamos com o token e abrimos o resultado numa aba.
  async function abrirDocumento() {
    setErro('');
    const win = window.open('', '_blank'); // abre no gesto do clique (evita bloqueio de pop-up)
    if (win) win.document.write('Gerando documento da OS...');
    try {
      const res = await fetch(`${API_BASE}/os/os_pdf.php?id=${id}`, { headers: { Authorization: 'Bearer ' + getToken() } });
      if (!res.ok) throw new Error();
      const url = URL.createObjectURL(await res.blob());
      if (win) win.location.href = url; else window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      if (win) win.close();
      setErro('Não foi possível abrir o documento da OS.');
    }
  }

  async function adicionarMaterial(e: FormEvent) {
    e.preventDefault();
    setErro(''); setMsg('');
    setSalvandoMaterial(true);
    try {
      let materialId = Number(matForm.material_id);
      const valorNum = matForm.valor_unitario !== '' ? Number(matForm.valor_unitario) : undefined;
      if (matForm.material_id === 'novo') {
        const nome = matForm.novoNome.trim();
        if (!nome) throw new Error('Informe o nome do novo material.');
        const criado = await api<{ id: number }>('/estoque/materiais.php', { method: 'POST', body: { nome, valor_unitario: valorNum ?? 0 } });
        materialId = criado.id;
      }
      if (!materialId) throw new Error('Selecione um material ou cadastre um novo.');
      const qtd = Number(matForm.quantidade);
      if (!qtd || qtd <= 0) throw new Error('Informe a quantidade.');
      await api('/estoque/movimentacoes.php', {
        method: 'POST',
        body: {
          material_id: materialId,
          tipo: 'saida',
          quantidade: qtd,
          ...(valorNum !== undefined ? { valor_unitario: valorNum } : {}),
          ordem_servico_id: Number(id),
        },
      });
      setMatForm({ material_id: '', novoNome: '', quantidade: '', valor_unitario: '' });
      setMsg('Material adicionado à OS.');
      api<MaterialCatalogo[]>('/estoque/materiais.php').then(setMateriaisCatalogo).catch(() => {});
      await carregar();
    } catch (e2) {
      setErro(e2 instanceof Error ? e2.message : String(e2));
    } finally {
      setSalvandoMaterial(false);
    }
  }

  async function deletarImagem(imagemId: number) {
    if (!window.confirm('Excluir esta imagem?')) return;
    setErro(''); setMsg('');
    try {
      await api('/os/os_imagens.php?id=' + imagemId, { method: 'DELETE' });
      setMsg('Imagem excluída.');
      await carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    }
  }

  async function enviarImagem(e: FormEvent) {
    e.preventDefault();
    if (!arquivos.length) return;
    setErro('');
    setMsg('');
    setEnviandoImagem(true);
    try {
      for (const arq of arquivos) {
        const fd = new FormData();
        fd.append('ordem_servico_id', String(id));
        fd.append('tipo', tipoImagem);
        fd.append('imagem', await comprimirImagem(arq));
        await api('/os/os_imagens.php', { method: 'POST', body: fd, isForm: true });
      }
      setArquivos([]);
      setMsg(arquivos.length > 1 ? 'Imagens anexadas.' : 'Imagem anexada.');
      await carregar();
    } catch (e2) {
      setErro(e2 instanceof Error ? e2.message : String(e2));
    } finally {
      setEnviandoImagem(false);
    }
  }

  async function salvarChecklist(e: FormEvent) {
    e.preventDefault();
    if (!os) return;
    setErro('');
    setMsg('');
    setSalvandoChecklist(true);
    try {
      const itens = checklistModelos.flatMap((m) => m.itens || []);
      if (!itens.length) throw new Error('Este checklist ainda não tem itens cadastrados. Vá no menu Checklist, selecione o modelo da categoria/tipo de chamado e adicione os itens.');
      for (const item of itens) {
        const resp = checklistRespostas[item.id];
        if (marcado(item.obrigatorio) && !resp?.marcado) {
          throw new Error('Marque o item obrigatório: ' + item.descricao);
        }
        if (marcado(item.exige_observacao) && !(resp?.observacao || '').trim()) {
          throw new Error('Preencha a observação do item: ' + item.descricao);
        }
        if (marcado(item.exige_foto) && !resp?.imagem_url && !checklistArquivos[item.id]) {
          throw new Error('Anexe a foto do item: ' + item.descricao);
        }
      }
      const respostas = [];
      for (const item of itens) {
        let imagemUrl = checklistRespostas[item.id]?.imagem_url || '';
        const arquivoItem = checklistArquivos[item.id];
        if (arquivoItem) {
          const fd = new FormData();
          fd.append('imagem', await comprimirImagem(arquivoItem));
          const up = await api<{ imagem_url: string }>('/checklist/imagem.php', { method: 'POST', body: fd, isForm: true });
          imagemUrl = up.imagem_url;
        }
        respostas.push({
          checklist_item_id: item.id,
          marcado: Boolean(checklistRespostas[item.id]?.marcado),
          observacao: checklistRespostas[item.id]?.observacao || null,
          imagem_url: imagemUrl || null,
        });
      }
      await api('/checklist/respostas.php', {
        method: 'POST',
        body: { ordem_servico_id: os.id, respostas },
      });
      setMsg('Checklist salvo.');
      await carregar();
    } catch (e2) {
      setErro(e2 instanceof Error ? e2.message : String(e2));
    } finally {
      setSalvandoChecklist(false);
    }
  }

  if (erro && !os) return <div className="msg-erro">{erro}</div>;
  if (!os) return <Loading />;

  const encerrada = os.status === 'concluido' || os.status === 'cancelado';
  const podeAgendar = ['admin_geral', 'admin_empresa', 'supervisor'].includes(user?.perfil || '');
  return (
    <div>
      <div className="titulo-pg">
        <h1>OS {os.codigo} <span className={'badge st-' + os.status}>{rotuloStatus(os.status)}</span></h1>
        <Link to="/app/os" className="btn sec sm">Voltar</Link>
      </div>
      {erro && <div className="msg-erro">{erro}</div>}
      {msg && <div className="msg-ok">{msg}</div>}
      {encerrada && (
        <div className="msg-encerrada">🔒 OS encerrada ({rotuloStatus(os.status)}) — somente consulta e PDF. Nenhuma ação pode ser alterada.</div>
      )}

      <div className="grid cols2">
        <div className="card">
          <h3>Dados</h3>
          <div className="os-dados">
            <div className="os-campo"><span className="k">Tipo</span><span className="v">{rotuloTipo(os.tipo_os)}</span></div>
            <div className="os-campo"><span className="k">Prioridade</span><span className="v"><span className={'badge pr-' + os.prioridade}>{rotuloPrioridade(os.prioridade)}</span></span></div>
            <div className="os-campo full"><span className="k">Local</span><span className="v">{[os.unidade_nome, os.piso_nome, os.local_nome].filter(Boolean).join(' / ') || '—'}</span></div>
            {isPremium && <div className="os-campo"><span className="k">Equipamento</span><span className="v">{os.ativo_nome || '-'}</span></div>}
            <div className="os-campo"><span className="k">Solicitante</span><span className="v">{os.solicitante_nome || '-'}</span></div>
            <div className="os-campo"><span className="k">Técnico</span><span className="v">{os.tecnico_nome || '-'}</span></div>
            <div className="os-campo"><span className="k">Tempo total</span><span className="v">{os.tempo_total_minutos ?? '-'} min</span></div>
            {os.avaria && <div className="os-campo full"><span className="k">Avaria</span><span className="v bloco">{os.avaria}</span></div>}
            {os.descricao && <div className="os-campo full"><span className="k">Descrição</span><span className="v bloco">{os.descricao}</span></div>}
            {os.observacao && <div className="os-campo full"><span className="k">Observação</span><span className="v bloco">{os.observacao}</span></div>}
          </div>
        </div>
        <div className="card">
          <h3>Ações</h3>
          <label>Estado da OS</label>
          <div className="estado-os-grid">
            {ESTADOS_VISIVEIS.map((estado) => {
              const atual = os.status === estado;
              const habilitado = podeMudarEstado(os.status, estado);
              return (
                <button
                  key={estado}
                  type="button"
                  className={'estado-os-btn st-' + estado + (atual ? ' atual' : '')}
                  disabled={!habilitado}
                  onClick={() => acaoEstado(estado)}
                >
                  {rotuloBotaoEstado(os.status, estado)}
                </button>
              );
            })}
          </div>
          {podeAgendar && !encerrada && os.status === 'aberto' && (
            <button type="button" className="btn sec sm" style={{ marginTop: 8 }} onClick={abrirAgendar}>📅 Reagendar / trocar técnico</button>
          )}
          {agendarAberto && (
            <form onSubmit={salvarAgendamento} style={{ marginTop: 10, padding: 14, border: '1px solid var(--cinza-borda)', borderRadius: 12, background: 'var(--cinza)' }}>
              <strong style={{ display: 'block', marginBottom: 6 }}>Agendar chamado</strong>
              <div className="grid cols2">
                <div><label>Data</label><input className="input" type="date" value={ag.data_agendada} onChange={(e) => setAg({ ...ag, data_agendada: e.target.value })} /></div>
                <div><label>Hora</label><input className="input" type="time" value={ag.hora_agendada} onChange={(e) => setAg({ ...ag, hora_agendada: e.target.value })} /></div>
              </div>
              <label>Técnico responsável</label>
              <select value={ag.tecnico_id} onChange={(e) => setAg({ ...ag, tecnico_id: e.target.value })}>
                <option value="">Sem técnico definido</option>
                {usuarios.map((u) => <option key={u.id} value={u.id}>{u.nome}{u.perfil ? ' (' + u.perfil + ')' : ''}</option>)}
              </select>
              <div className="form-actions">
                <button type="button" className="btn sec sm" onClick={() => setAgendarAberto(false)}>Cancelar</button>
                <button className="btn sm" disabled={salvandoAgenda}>{salvandoAgenda ? 'Salvando...' : 'Salvar agendamento'}</button>
              </div>
            </form>
          )}
          <label style={{ marginTop: 14 }}>WhatsApp</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <button className="btn sm" onClick={() => enviarWhatsapp('tecnico')}>Enviar para técnico</button>
            <button className="btn sm" onClick={() => enviarWhatsapp('cliente')}>Enviar para cliente</button>
          </div>
          <label style={{ marginTop: 14 }}>Documento</label>
          <button type="button" className="btn sec sm" onClick={abrirDocumento}>Abrir PDF/Impressão</button>
        </div>
      </div>

      <div className="grid cols2" style={{ marginTop: 14 }}>
        <div className="card">
          <h3>Imagens</h3>
          {!encerrada && (
          <form onSubmit={enviarImagem}>
            <div className="grid cols2">
              <div>
                <label>Tipo</label>
                <select value={tipoImagem} onChange={(e) => setTipoImagem(e.target.value)}>
                  <option value="abertura">Abertura</option>
                  <option value="execucao">Execução</option>
                  <option value="conclusao">Conclusão</option>
                </select>
              </div>
              <div>
                <label>Arquivos</label>
                <input className="input" type="file" accept="image/*" multiple onChange={(e) => setArquivos(Array.from(e.target.files || []))} />
              </div>
            </div>
            <div className="form-actions">
              <button className="btn" disabled={!arquivos.length || enviandoImagem}>{enviandoImagem ? 'Enviando...' : (arquivos.length > 1 ? 'Anexar ' + arquivos.length + ' imagens' : 'Anexar imagem')}</button>
            </div>
          </form>
          )}
          <div className="image-grid">
            {os.imagens.map((img) => (
              <div key={img.id} className="image-tile">
                <a href={urlImagem(img.imagem_url)} target="_blank" rel="noreferrer">
                  <img src={urlImagem(img.imagem_url)} alt="" />
                </a>
                <span>{img.tipo}</span>
                {!encerrada && <button type="button" className="tile-del" title="Excluir imagem" onClick={() => deletarImagem(img.id)}>×</button>}
              </div>
            ))}
            {!os.imagens.length && <p className="vazio">Nenhuma imagem anexada.</p>}
          </div>
        </div>

        {isPremium && (
          <div className="card">
            <h3>Checklist da OS</h3>
            {!checklistModelos.length && (
              <p style={{ color: 'var(--texto-suave)' }}>Nenhum checklist vinculado ao tipo de chamado ou ao equipamento desta OS. Cadastre um modelo de checklist para a categoria correspondente.</p>
            )}
            {!!checklistModelos.length && (
              <form onSubmit={salvarChecklist}>
                {checklistModelos.map((modelo) => (
                  <div key={modelo.id} style={{ marginTop: 10 }}>
                    <strong>{modelo.nome}</strong>
                    <div className="checklist-os-list">
                      {modelo.itens.map((item) => (
                        <div className="checklist-os-item" key={item.id}>
                          <label className="check-line">
                            <input
                              type="checkbox"
                              checked={Boolean(checklistRespostas[item.id]?.marcado)}
                              onChange={(ev) => setResposta(item.id, { marcado: ev.target.checked })}
                            />
                            <span>{item.descricao}{marcado(item.obrigatorio) ? ' *' : ''}</span>
                          </label>
                          <input
                            className="input"
                            value={checklistRespostas[item.id]?.observacao || ''}
                            onChange={(ev) => setResposta(item.id, { observacao: ev.target.value })}
                            placeholder={marcado(item.exige_observacao) ? 'Observação obrigatória' : 'Observação'}
                          />
                          <div className="checklist-os-upload">
                            <input
                              className="input mini-file"
                              type="file"
                              accept="image/*"
                              onChange={(ev) => setChecklistArquivos((atuais) => ({ ...atuais, [item.id]: ev.target.files?.[0] || null }))}
                            />
                            {checklistRespostas[item.id]?.imagem_url && (
                              <a href={urlImagem(checklistRespostas[item.id].imagem_url)} target="_blank" rel="noreferrer">
                                <img src={urlImagem(checklistRespostas[item.id].imagem_url)} alt="" className="thumb" />
                              </a>
                            )}
                            {checklistArquivos[item.id] && <span className="badge" style={{ background: '#dcfce7', color: '#15803d' }}>✓ nova foto — salve o checklist</span>}
                            {marcado(item.exige_foto) && <span className="badge">foto exigida</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {!encerrada && (
                  <div className="form-actions">
                    <button className="btn" disabled={salvandoChecklist}>{salvandoChecklist ? 'Salvando...' : 'Salvar checklist'}</button>
                  </div>
                )}
              </form>
            )}

          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <h3>Materiais usados</h3>
        {!encerrada && (
        <form onSubmit={adicionarMaterial} className="grid cols2" style={{ gap: 8, alignItems: 'end' }}>
          <div>
            <label>Material</label>
            <select value={matForm.material_id} onChange={(e) => {
              const v = e.target.value;
              const mat = materiaisCatalogo.find((m) => String(m.id) === v);
              setMatForm((f) => ({ ...f, material_id: v, valor_unitario: mat ? String(mat.valor_unitario ?? '') : f.valor_unitario }));
            }}>
              <option value="">Selecione</option>
              {materiaisCatalogo.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
              <option value="novo">+ Cadastrar novo material</option>
            </select>
          </div>
          {matForm.material_id === 'novo' && (
            <div>
              <label>Nome do novo material</label>
              <input className="input" value={matForm.novoNome} onChange={(e) => setMatForm({ ...matForm, novoNome: e.target.value })} placeholder="Ex.: Cabo de rede" />
            </div>
          )}
          <div>
            <label>Quantidade</label>
            <input className="input" type="number" step="0.001" min="0" value={matForm.quantidade} onChange={(e) => setMatForm({ ...matForm, quantidade: e.target.value })} />
          </div>
          <div>
            <label>Valor unitário (R$)</label>
            <input className="input" type="number" step="0.01" min="0" value={matForm.valor_unitario} onChange={(e) => setMatForm({ ...matForm, valor_unitario: e.target.value })} placeholder="opcional" />
          </div>
          <div className="form-actions" style={{ gridColumn: '1 / -1' }}>
            <button className="btn" disabled={salvandoMaterial}>{salvandoMaterial ? 'Adicionando...' : 'Adicionar material à OS'}</button>
          </div>
        </form>
        )}

        <div className="tabela-wrap" style={{ marginTop: 12 }}>
          <table>
            <thead><tr><th>Material</th><th>Qtd</th><th>Valor unit.</th><th>Total</th></tr></thead>
            <tbody>
              {os.materiais.map((m) => (
                <tr key={m.id}>
                  <td>{m.material_nome}</td>
                  <td>{m.quantidade}</td>
                  <td>R$ {Number(m.valor_unitario || 0).toFixed(2)}</td>
                  <td>R$ {Number(m.valor_total || 0).toFixed(2)}</td>
                </tr>
              ))}
              {!os.materiais.length && <tr><td colSpan={4} className="vazio">Nenhum material adicionado.</td></tr>}
              {!!os.materiais.length && (
                <tr><th colSpan={3} style={{ textAlign: 'right' }}>Total</th><th>R$ {os.materiais.reduce((s, m) => s + Number(m.valor_total || 0), 0).toFixed(2)}</th></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <h3>Assinaturas</h3>
        {encerrada && <p style={{ color: 'var(--texto-suave)', marginTop: 0 }}>Assinaturas bloqueadas porque a OS está encerrada.</p>}
        <div className="grid cols2">
          <AssinaturaPad
            titulo="Assinatura do técnico"
            imagemUrl={urlImagem(os.assinatura_tecnico_url)}
            bloqueado={encerrada}
            onSalvar={(arquivo) => salvarAssinatura('tecnico', arquivo)}
          />
          <AssinaturaPad
            titulo="Assinatura do cliente"
            imagemUrl={urlImagem(os.assinatura_cliente_url)}
            bloqueado={encerrada}
            onSalvar={(arquivo) => salvarAssinatura('cliente', arquivo)}
          />
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <h3>Histórico</h3>
        <table>
          <thead><tr><th>Quando</th><th>Acao</th><th>De / Para</th></tr></thead>
          <tbody>
            {os.historico.map((h) => (
              <tr key={h.id}><td>{dataHora(h.created_at)}</td><td>{h.acao}</td>
                <td>{h.status_anterior ? rotuloStatus(h.status_anterior) : '-'} / {h.status_novo ? rotuloStatus(h.status_novo) : '-'}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      {confirma && createPortal(
        <div onClick={() => setConfirma(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(11,31,77,.55)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 2000 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 18, padding: '24px 26px 18px', width: '100%', maxWidth: 440, boxShadow: '0 30px 70px rgba(11,31,77,.35)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <span style={{ width: 42, height: 42, borderRadius: 12, background: confirma.cor === 'var(--erro)' ? '#fee2e2' : '#dcfce7', color: confirma.cor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, flexShrink: 0 }}>!</span>
              <h3 style={{ margin: 0, fontSize: 18 }}>{confirma.titulo}</h3>
            </div>
            <div style={{ color: 'var(--texto-suave)', fontSize: 14, lineHeight: 1.65 }}>
              {confirma.linhas.map((l, i) => <div key={i}>{l}</div>)}
            </div>
            <div className="form-actions" style={{ marginTop: 18 }}>
              <button type="button" className="btn sec" onClick={() => setConfirma(null)}>Voltar</button>
              <button type="button" className="btn" style={{ background: confirma.cor, boxShadow: 'none' }} onClick={() => { const a = confirma.acao; setConfirma(null); a(); }}>{confirma.rotulo}</button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
