// Rótulos em pt-br para enums (evita mostrar "em_andamento" cru na tela).

export const STATUS_OS: Record<string, { label: string; cor: string }> = {
  aberto:               { label: 'Atribuído',             cor: '#2563eb' },
  em_andamento:         { label: 'Em execução',           cor: '#d97706' },
  interrompido:         { label: 'Interrompido',          cor: '#dc2626' },
  aguardando_aprovacao: { label: 'Aguardando aprovação do cliente', cor: '#7c3aed' },
  concluido:            { label: 'Concluído',             cor: '#16a34a' },
  cancelado:            { label: 'Cancelado',             cor: '#64748b' },
};

export const PRIORIDADE: Record<string, string> = {
  baixa: 'Baixa', media: 'Média', alta: 'Alta', urgente: 'Urgente',
};

export const TIPO_OS: Record<string, string> = {
  corretiva: 'Corretiva', preventiva: 'Preventiva',
};

export const rotuloStatus = (s: string): string => STATUS_OS[s]?.label ?? s;
export const corStatus = (s: string): string => STATUS_OS[s]?.cor ?? '#64748b';
export const rotuloPrioridade = (p: string): string => PRIORIDADE[p] ?? p;
export const rotuloTipo = (t: string): string => TIPO_OS[t] ?? t;

export const STATUS_LISTA = Object.keys(STATUS_OS);

// Formata timestamp (do Postgres/ISO) em pt-br: dd/mm/aaaa hh:mm (horário local).
export function dataHora(s?: string | null): string {
  if (!s) return '-';
  const bruto = String(s).trim();
  let normalizado = bruto.includes('T') ? bruto : bruto.replace(' ', 'T');
  normalizado = normalizado.replace(/(\.\d{3})\d+/, '$1');
  normalizado = normalizado.replace(/([+-]\d{2})$/, '$1:00');
  normalizado = normalizado.replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
  const d = new Date(normalizado);
  const direto = bruto.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  const p = (n: number) => String(n).padStart(2, '0');
  if (isNaN(d.getTime()) && direto) {
    const [, ano, mes, dia, hora, minuto] = direto;
    return `${dia}/${mes}/${ano} ${hora}:${minuto}`;
  }
  if (isNaN(d.getTime())) return s;
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
