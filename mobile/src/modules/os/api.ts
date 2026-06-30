import type { ImagePickerAsset } from 'expo-image-picker';

import { api } from '../../lib/api';
import { criarArquivoUpload } from '../../lib/files';
import type {
  Ativo,
  AssinaturaTipo,
  Categoria,
  ChecklistModelo,
  Local,
  Opcao,
  OSDetalheData,
  OSItem,
  Piso,
  Tecnico,
} from '../../types/mobile';

export async function listarOS(status?: string) {
  const qs = status ? '?status=' + encodeURIComponent(status) : '';
  return api<OSItem[]>('/os/os_listar.php' + qs);
}

export async function detalharOS(id: number) {
  return api<OSDetalheData>('/os/os_detalhe.php?id=' + id);
}

export async function listarUnidades() {
  return api<Opcao[]>('/cadastros/unidades.php');
}

export async function listarPisos(unidadeId: string) {
  return api<Piso[]>('/cadastros/pisos.php?unidade_id=' + unidadeId);
}

export async function listarLocais(pisoId: string) {
  return api<Local[]>('/cadastros/locais.php?piso_id=' + pisoId);
}

export async function listarTecnicos() {
  return api<Tecnico[]>('/cadastros/tecnicos.php');
}

export async function listarCategorias() {
  return api<Categoria[]>('/cadastros/categorias.php');
}

export async function listarAtivos() {
  return api<Ativo[]>('/ativos/ativos.php');
}

export async function criarOS(body: Record<string, unknown>) {
  return api<{ id: number }>('/os/os_criar.php', { method: 'POST', body });
}

export async function atualizarStatusOS(id: number, status: string) {
  return api('/os/os_atualizar_status.php', { method: 'POST', body: { id, status } });
}

export async function reagendarOS(body: {
  ordem_servico_id: number;
  data_agendada: string | null;
  hora_agendada: string | null;
  tecnico_id: number | null;
}) {
  return api('/os/os_agendar.php', { method: 'POST', body });
}

export async function listarChecklistPorOS(osId: number) {
  return api<ChecklistModelo[]>('/checklist/por_os.php?os_id=' + osId);
}

export async function salvarChecklistRespostas(body: {
  ordem_servico_id: number;
  respostas: Array<{
    checklist_item_id: number;
    marcado: boolean;
    observacao: string | null;
    imagem_url: string | null;
  }>;
}) {
  return api('/checklist/respostas.php', { method: 'POST', body });
}

export async function uploadImagemChecklist(asset: ImagePickerAsset) {
  const fd = new FormData();
  fd.append('imagem', criarArquivoUpload(asset.uri, asset.fileName, asset.mimeType) as any);
  return api<{ imagem_url: string }>('/checklist/imagem.php', { method: 'POST', body: fd, isForm: true });
}

export async function uploadImagemOS(
  ordemServicoId: number,
  tipo: 'abertura' | 'execucao' | 'conclusao',
  asset: ImagePickerAsset,
) {
  const fd = new FormData();
  fd.append('ordem_servico_id', String(ordemServicoId));
  fd.append('tipo', tipo);
  fd.append('imagem', criarArquivoUpload(asset.uri, asset.fileName, asset.mimeType) as any);
  return api('/os/os_imagens.php', { method: 'POST', body: fd, isForm: true });
}

export async function excluirImagemOS(id: number) {
  return api('/os/os_imagens.php?id=' + id, { method: 'DELETE' });
}

export async function salvarAssinatura(ordemServicoId: number, tipo: AssinaturaTipo, uri: string) {
  const fd = new FormData();
  fd.append('ordem_servico_id', String(ordemServicoId));
  fd.append('tipo', tipo);
  fd.append('assinatura', criarArquivoUpload(uri, `assinatura-${tipo}.png`, 'image/png') as any);
  return api('/os/os_assinatura.php', { method: 'POST', body: fd, isForm: true });
}
