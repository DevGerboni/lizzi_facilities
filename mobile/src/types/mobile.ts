export type Tab = 'os' | 'agenda' | 'nova';
export type AssinaturaTipo = 'tecnico' | 'cliente';

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  perfil: string;
  plano?: string | null;
}

export interface Opcao {
  id: number;
  nome: string;
}

export interface Piso extends Opcao {
  unidade_id: number;
}

export interface Local extends Opcao {
  unidade_id: number;
  piso_id: number;
}

export interface Tecnico extends Opcao {
  unidades?: number[];
}

export interface Categoria extends Opcao {
  tipo: string;
}

export interface Ativo extends Opcao {
  unidade_id: number;
  piso_id: number;
  local_id: number;
  categoria_id?: number | null;
  qr_code?: string | null;
}

export interface OSItem {
  id: number;
  codigo: string;
  status: string;
  tipo_os: string;
  prioridade: string;
  unidade_nome: string | null;
  piso_nome: string | null;
  local_nome: string | null;
  ativo_nome: string | null;
  tecnico_nome: string | null;
  solicitante_nome?: string | null;
  data_agendada: string | null;
  hora_agendada: string | null;
  created_at: string;
}

export interface ChecklistResp {
  id: number;
  checklist_item_id: number;
  descricao: string;
  marcado: boolean | string;
  observacao: string | null;
  imagem_url: string | null;
}

export interface ChecklistItem {
  id: number;
  descricao: string;
  obrigatorio: boolean | string;
  exige_foto: boolean | string;
  exige_observacao: boolean | string;
  ordem: number;
}

export interface ChecklistModelo {
  id: number;
  nome: string;
  itens: ChecklistItem[];
}

export interface ImagemOS {
  id: number;
  imagem_url: string;
  tipo: string;
  created_at: string;
}

export interface HistoricoOS {
  id: number;
  usuario_id?: number | null;
  acao: string;
  status_anterior: string | null;
  status_novo: string | null;
  observacao?: string | null;
  created_at: string;
}

export interface MaterialUso {
  id: number;
  material_nome: string;
  tipo: string;
  quantidade: string | number;
  valor_unitario: string | number;
  valor_total: string | number;
  created_at: string;
}

export interface OSDetalheData extends OSItem {
  tecnico_id: number | null;
  solicitante_id?: number | null;
  ativo_id: number | null;
  ativo_categoria_id: number | null;
  avaria: string | null;
  descricao: string | null;
  observacao: string | null;
  inicio_atendimento: string | null;
  fim_atendimento: string | null;
  tempo_total_minutos: number | null;
  assinatura_tecnico_url: string | null;
  assinatura_cliente_url: string | null;
  checklist: ChecklistResp[];
  imagens: ImagemOS[];
  historico?: HistoricoOS[];
  materiais?: MaterialUso[];
}

export interface ChecklistRespostaState {
  marcado: boolean;
  observacao: string;
  imagem_url: string;
}

export interface NovoOSForm {
  unidade_id: string;
  piso_id: string;
  local_id: string;
  ativo_id: string;
  tecnico_id: string;
  tipo_os: string;
  prioridade: string;
  avaria: string;
  descricao: string;
  observacao: string;
  data_agendada: string;
  hora_agendada: string;
}
