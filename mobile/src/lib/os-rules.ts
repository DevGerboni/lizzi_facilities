export const STATUS = [
  'aberto',
  'em_andamento',
  'interrompido',
  'aguardando_aprovacao',
  'concluido',
  'cancelado',
];

export const PRIORIDADES: Array<[string, string]> = [
  ['baixa', 'Baixa'],
  ['media', 'Média'],
  ['alta', 'Alta'],
  ['urgente', 'Urgente'],
];

export const STATUS_COLOR: Record<string, string> = {
  aberto: '#2563eb',
  em_andamento: '#d97706',
  interrompido: '#dc2626',
  aguardando_aprovacao: '#7c3aed',
  concluido: '#16a34a',
  cancelado: '#64748b',
};

export function podeMudarEstado(atual: string, destino: string): boolean {
  if (atual === destino) return false;
  if (['concluido', 'cancelado'].includes(atual)) return false;
  if (destino === 'cancelado') return true;
  if (atual === 'aberto') return destino === 'em_andamento';
  if (atual === 'em_andamento') return ['interrompido', 'aguardando_aprovacao', 'concluido'].includes(destino);
  if (atual === 'interrompido') return destino === 'em_andamento';
  if (atual === 'aguardando_aprovacao') return destino === 'aberto';
  return false;
}

export function rotuloBotaoEstado(atual: string, destino: string): string {
  if (atual === destino) return destino;
  if (destino === 'em_andamento') return atual === 'aberto' ? 'Iniciar' : 'Retomar';
  if (destino === 'interrompido') return 'Pausar';
  if (destino === 'aguardando_aprovacao') return 'Enviar p/ aprovação';
  if (atual === 'aguardando_aprovacao' && destino === 'aberto') return 'Agendar novamente';
  if (destino === 'concluido') return 'Concluir';
  if (destino === 'cancelado') return 'Cancelar';
  return destino;
}

export function podeReagendar(perfil?: string | null): boolean {
  return ['admin_geral', 'admin_empresa', 'supervisor'].includes(perfil || '');
}
