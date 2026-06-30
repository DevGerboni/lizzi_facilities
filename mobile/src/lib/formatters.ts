import type { OSDetalheData, OSItem } from '../types/mobile';

const STATUS_LABEL: Record<string, string> = {
  aberto: 'Atribuído',
  em_andamento: 'Em execução',
  interrompido: 'Interrompido',
  aguardando_aprovacao: 'Aguardando aprovação do cliente',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
};

const PRIORIDADE_LABEL: Record<string, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  urgente: 'Urgente',
};

export function bool(v: unknown): boolean {
  return v === true || v === 'true' || v === '1' || v === 1;
}

export function rotuloStatus(status: string): string {
  return STATUS_LABEL[status] || status;
}

export function rotuloPrioridade(prioridade: string): string {
  return PRIORIDADE_LABEL[prioridade] || prioridade;
}

export function localOs(
  os: Pick<OSItem, 'unidade_nome' | 'piso_nome' | 'local_nome' | 'ativo_nome'>,
): string {
  return [os.unidade_nome, os.piso_nome, os.local_nome].filter(Boolean).join(' / ') || os.ativo_nome || '-';
}

export function dataHora(data?: string | null, hora?: string | null): string {
  if (!data) return '-';
  const texto = [data, hora].filter(Boolean).join(' ');
  const m = texto.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/);
  if (!m) return texto;
  return `${m[3]}/${m[2]}/${m[1]}${m[4] ? ` ${m[4]}:${m[5]}` : ''}`;
}

export function dataHoraCompleta(valor?: string | null): string {
  if (!valor) return '-';
  const texto = String(valor).trim();
  const m = texto.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)/);
  if (!m) return dataHora(texto);
  return `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}:${m[6] || '00'}`;
}

export function minutosHHMM(valor?: number | string | null): string {
  if (valor === null || valor === undefined || valor === '' || Number.isNaN(Number(valor))) return '-';
  const min = Math.max(0, Math.round(Number(valor)));
  return `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
}

export function minutosExecucao(
  os: Pick<OSDetalheData, 'status' | 'inicio_atendimento' | 'fim_atendimento' | 'tempo_total_minutos'>,
): number | null {
  if (os.tempo_total_minutos !== null && os.tempo_total_minutos > 0 && os.status !== 'em_andamento') {
    return os.tempo_total_minutos;
  }
  if (!os.inicio_atendimento) return os.tempo_total_minutos;

  const inicio = new Date(String(os.inicio_atendimento).replace(' ', 'T')).getTime();
  if (Number.isNaN(inicio)) return os.tempo_total_minutos;

  const fimTexto = os.status === 'em_andamento' ? null : os.fim_atendimento;
  const fim = fimTexto ? new Date(String(fimTexto).replace(' ', 'T')).getTime() : Date.now();
  if (Number.isNaN(fim) || fim < inicio) return os.tempo_total_minutos ?? 0;

  const intervalo = Math.ceil((fim - inicio) / 60000);
  return Math.max(intervalo > 0 ? 1 : 0, os.tempo_total_minutos ?? 0);
}
