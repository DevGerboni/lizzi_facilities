-- =============================================================================
-- LIZZI FACILITIES — TEMPLATE DO BANCO DE CADA EMPRESA (1 banco por cliente)
-- =============================================================================
-- Rodar este arquivo DENTRO do banco recém-criado da empresa (ex.: lizzi_emp_1).
-- NÃO tem tenant_id: o próprio banco já isola os dados de uma empresa.
--
-- Referências a usuários (solicitante_id, tecnico_id, usuario_id) apontam para
-- usuarios.id do BANCO CENTRAL (lizzi_facilities) e por isso são BIGINT SEM FK
-- (PostgreSQL não faz JOIN/FK entre bancos — o nome é resolvido no PHP).
--
-- FLUXO no cadastro de uma empresa (no PHP):
--   1) INSERT em empresas (central) -> obtém id
--   2) db = 'lizzi_emp_' || id
--   3) CREATE DATABASE <db> WITH ENCODING 'UTF8' TEMPLATE template0;   (fora de transação)
--   4) conectar em <db> e rodar ESTE arquivo
--   5) UPDATE empresas SET db_nome = <db> WHERE id = ...
--   6) (opcional) inserir a linha de configuracoes_empresa
--
-- COMO RODAR manualmente:
--   psql "postgresql://postgres:38653084@46.202.147.162:5432/lizzi_emp_1" -f tenant_template.sql
-- =============================================================================

BEGIN;

-- Atualiza updated_at automaticamente (função é por banco; recriar aqui)
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- configuracoes_empresa — 1 linha por banco (visual + WhatsApp/Evolution API)
-- -----------------------------------------------------------------------------
CREATE TABLE configuracoes_empresa (
  id                  BIGSERIAL PRIMARY KEY,
  nome_fantasia       VARCHAR(150),
  razao_social        VARCHAR(150),
  documento           VARCHAR(20),
  endereco            VARCHAR(255),
  telefone            VARCHAR(20),
  whatsapp            VARCHAR(20),
  email               VARCHAR(150),
  logo_url            VARCHAR(255),
  cor_primaria        VARCHAR(9),
  cor_secundaria      VARCHAR(9),
  whatsapp_numero     VARCHAR(20),     -- número de ORIGEM/envio (Evolution API)
  whatsapp_instancia  VARCHAR(100),    -- nome/ID da instância na Evolution API
  whatsapp_ativo      BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_upd_config BEFORE UPDATE ON configuracoes_empresa
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------------------------
-- Estrutura física: unidade -> piso -> local
-- -----------------------------------------------------------------------------
CREATE TABLE unidades (
  id          BIGSERIAL PRIMARY KEY,
  nome        VARCHAR(150) NOT NULL,
  endereco    VARCHAR(255),
  status      VARCHAR(20) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);
CREATE TRIGGER trg_upd_unidades BEFORE UPDATE ON unidades
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE pisos (
  id          BIGSERIAL PRIMARY KEY,
  unidade_id  BIGINT NOT NULL REFERENCES unidades(id),
  nome        VARCHAR(150) NOT NULL,
  status      VARCHAR(20) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);
CREATE INDEX idx_pisos_unidade ON pisos(unidade_id);
CREATE TRIGGER trg_upd_pisos BEFORE UPDATE ON pisos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE locais (
  id          BIGSERIAL PRIMARY KEY,
  unidade_id  BIGINT NOT NULL REFERENCES unidades(id),
  piso_id     BIGINT NOT NULL REFERENCES pisos(id),
  nome        VARCHAR(150) NOT NULL,
  status      VARCHAR(20) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);
CREATE INDEX idx_locais_unidade ON locais(unidade_id);
CREATE INDEX idx_locais_piso    ON locais(piso_id);
CREATE TRIGGER trg_upd_locais BEFORE UPDATE ON locais
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE categorias (
  id          BIGSERIAL PRIMARY KEY,
  nome        VARCHAR(150) NOT NULL,
  tipo        VARCHAR(20) NOT NULL DEFAULT 'ambos' CHECK (tipo IN ('ativo','chamado','ambos')),
  status      VARCHAR(20) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);
CREATE TRIGGER trg_upd_categorias BEFORE UPDATE ON categorias
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ativos (Premium) — todo ativo DEVE ter unidade + piso + local
CREATE TABLE ativos (
  id            BIGSERIAL PRIMARY KEY,
  unidade_id    BIGINT NOT NULL REFERENCES unidades(id),
  piso_id       BIGINT NOT NULL REFERENCES pisos(id),
  local_id      BIGINT NOT NULL REFERENCES locais(id),
  categoria_id  BIGINT REFERENCES categorias(id),
  nome          VARCHAR(150) NOT NULL,
  patrimonio    VARCHAR(50),
  marca         VARCHAR(100),
  fabricante    VARCHAR(100),
  modelo        VARCHAR(100),
  numero_serie  VARCHAR(100),
  qr_code       VARCHAR(255),
  foto_url      VARCHAR(255),
  status        VARCHAR(20) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);
CREATE INDEX idx_ativos_unidade   ON ativos(unidade_id);
CREATE INDEX idx_ativos_piso      ON ativos(piso_id);
CREATE INDEX idx_ativos_local     ON ativos(local_id);
CREATE INDEX idx_ativos_categoria ON ativos(categoria_id);
CREATE TRIGGER trg_upd_ativos BEFORE UPDATE ON ativos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- tecnicos_unidades — tecnico_id = usuarios.id do banco CENTRAL (sem FK entre bancos)
CREATE TABLE tecnicos_unidades (
  id          BIGSERIAL PRIMARY KEY,
  tecnico_id  BIGINT NOT NULL,                       -- usuarios.id (central)
  unidade_id  BIGINT NOT NULL REFERENCES unidades(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_tecnico_unidade ON tecnicos_unidades(tecnico_id, unidade_id);

-- -----------------------------------------------------------------------------
-- Ordem de Serviço
-- -----------------------------------------------------------------------------
-- codigo sequencial do banco (cada empresa começa em OS-000001)
CREATE SEQUENCE os_codigo_seq START 1;

CREATE TABLE ordens_servico (
  id                   BIGSERIAL PRIMARY KEY,
  codigo               VARCHAR(30) NOT NULL UNIQUE,          -- gerado por trigger
  unidade_id           BIGINT REFERENCES unidades(id),       -- opcional
  piso_id              BIGINT REFERENCES pisos(id),          -- opcional
  local_id             BIGINT REFERENCES locais(id),         -- opcional
  ativo_id             BIGINT REFERENCES ativos(id),         -- NULL no Plano Simples
  solicitante_id       BIGINT,                               -- usuarios.id (central)
  tecnico_id           BIGINT,                               -- usuarios.id (central)
  tipo_os              VARCHAR(150) NOT NULL,
  prioridade           VARCHAR(20)  NOT NULL DEFAULT 'media' CHECK (prioridade IN ('baixa','media','alta','urgente')),
  avaria               VARCHAR(255),
  descricao            TEXT,
  observacao           TEXT,
  data_agendada        DATE,
  hora_agendada        TIME,
  status               VARCHAR(30)  NOT NULL DEFAULT 'aberto'
                       CHECK (status IN ('aberto','em_andamento','interrompido','aguardando_aprovacao','concluido','cancelado')),
  inicio_atendimento   TIMESTAMPTZ,
  fim_atendimento      TIMESTAMPTZ,
  tempo_total_minutos  INTEGER,
  assinatura_tecnico_url VARCHAR(255),
  assinatura_cliente_url VARCHAR(255),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at           TIMESTAMPTZ
);
CREATE INDEX idx_os_unidade     ON ordens_servico(unidade_id);
CREATE INDEX idx_os_piso        ON ordens_servico(piso_id);
CREATE INDEX idx_os_local       ON ordens_servico(local_id);
CREATE INDEX idx_os_ativo       ON ordens_servico(ativo_id);
CREATE INDEX idx_os_solicitante ON ordens_servico(solicitante_id);
CREATE INDEX idx_os_tecnico     ON ordens_servico(tecnico_id);
CREATE INDEX idx_os_status      ON ordens_servico(status);
CREATE TRIGGER trg_upd_os BEFORE UPDATE ON ordens_servico
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Gera o codigo sequencial (ex.: OS-000001)
CREATE OR REPLACE FUNCTION gerar_codigo_os() RETURNS trigger AS $$
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    NEW.codigo := 'OS-' || LPAD(nextval('os_codigo_seq')::text, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_gerar_codigo_os BEFORE INSERT ON ordens_servico
  FOR EACH ROW EXECUTE FUNCTION gerar_codigo_os();

CREATE TABLE os_imagens (
  id               BIGSERIAL PRIMARY KEY,
  ordem_servico_id BIGINT NOT NULL REFERENCES ordens_servico(id),
  imagem_url       VARCHAR(255) NOT NULL,
  tipo             VARCHAR(20) NOT NULL CHECK (tipo IN ('abertura','execucao','conclusao')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_os_imagens_os ON os_imagens(ordem_servico_id);

CREATE TABLE os_historico (
  id               BIGSERIAL PRIMARY KEY,
  ordem_servico_id BIGINT NOT NULL REFERENCES ordens_servico(id),
  usuario_id       BIGINT,                               -- usuarios.id (central)
  acao             VARCHAR(50),
  status_anterior  VARCHAR(30),
  status_novo      VARCHAR(30),
  observacao       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_os_hist_os ON os_historico(ordem_servico_id);

-- -----------------------------------------------------------------------------
-- Checklist (Premium)
-- -----------------------------------------------------------------------------
CREATE TABLE checklist_modelos (
  id            BIGSERIAL PRIMARY KEY,
  categoria_id  BIGINT NOT NULL REFERENCES categorias(id),
  nome          VARCHAR(150) NOT NULL,
  status        VARCHAR(20) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);
CREATE INDEX idx_chk_mod_categoria ON checklist_modelos(categoria_id);
CREATE TRIGGER trg_upd_chk_mod BEFORE UPDATE ON checklist_modelos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE checklist_itens (
  id                  BIGSERIAL PRIMARY KEY,
  checklist_modelo_id BIGINT NOT NULL REFERENCES checklist_modelos(id),
  descricao           VARCHAR(255) NOT NULL,
  obrigatorio         BOOLEAN NOT NULL DEFAULT false,
  exige_foto          BOOLEAN NOT NULL DEFAULT false,
  exige_observacao    BOOLEAN NOT NULL DEFAULT false,
  ordem               INTEGER NOT NULL DEFAULT 0,
  status              VARCHAR(20) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at          TIMESTAMPTZ
);
CREATE INDEX idx_chk_item_modelo ON checklist_itens(checklist_modelo_id);
CREATE TRIGGER trg_upd_chk_item BEFORE UPDATE ON checklist_itens
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE os_checklist_respostas (
  id                 BIGSERIAL PRIMARY KEY,
  ordem_servico_id   BIGINT NOT NULL REFERENCES ordens_servico(id),
  checklist_item_id  BIGINT NOT NULL REFERENCES checklist_itens(id),
  marcado            BOOLEAN NOT NULL DEFAULT false,
  observacao         TEXT,
  imagem_url         VARCHAR(255),
  usuario_id         BIGINT,                               -- usuarios.id (central)
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_chk_resp_os   ON os_checklist_respostas(ordem_servico_id);
CREATE INDEX idx_chk_resp_item ON os_checklist_respostas(checklist_item_id);

-- -----------------------------------------------------------------------------
-- Estoque (Premium)
-- -----------------------------------------------------------------------------
CREATE TABLE materiais (
  id                BIGSERIAL PRIMARY KEY,
  nome              VARCHAR(150) NOT NULL,
  codigo            VARCHAR(50),
  unidade_medida    VARCHAR(20),
  quantidade_atual  NUMERIC(12,3) NOT NULL DEFAULT 0,
  valor_unitario    NUMERIC(12,2) NOT NULL DEFAULT 0,
  status            VARCHAR(20) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);
CREATE TRIGGER trg_upd_materiais BEFORE UPDATE ON materiais
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE materiais_movimentacoes (
  id                BIGSERIAL PRIMARY KEY,
  material_id       BIGINT NOT NULL REFERENCES materiais(id),
  ordem_servico_id  BIGINT REFERENCES ordens_servico(id),
  tipo              VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada','saida')),
  quantidade        NUMERIC(12,3) NOT NULL,
  valor_unitario    NUMERIC(12,2),
  valor_total       NUMERIC(12,2),
  usuario_id        BIGINT,                               -- usuarios.id (central)
  observacao        TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_mat_mov_material ON materiais_movimentacoes(material_id);
CREATE INDEX idx_mat_mov_os       ON materiais_movimentacoes(ordem_servico_id);

-- -----------------------------------------------------------------------------
-- logs (Regra 11) — usuario_id = usuarios.id (central)
-- -----------------------------------------------------------------------------
CREATE TABLE logs (
  id           BIGSERIAL PRIMARY KEY,
  usuario_id   BIGINT,
  entidade     VARCHAR(100) NOT NULL,
  entidade_id  BIGINT,
  acao         VARCHAR(20) NOT NULL CHECK (acao IN ('criar','alterar','excluir')),
  dados_antes  JSONB,
  dados_depois JSONB,
  ip           VARCHAR(45),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_logs_entidade ON logs(entidade, entidade_id);

-- (opcional) linha inicial de configuração da empresa
-- INSERT INTO configuracoes_empresa (nome_fantasia, cor_primaria, cor_secundaria, whatsapp_ativo)
--   VALUES ('Minha Empresa', '#1E66F5', '#FFFFFF', false);

COMMIT;
