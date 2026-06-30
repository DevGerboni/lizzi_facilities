-- =============================================================================
-- LIZZI FACILITIES — BANCO CENTRAL
-- Base: lizzi_facilities  ·  Host: 46.202.147.162:5432  ·  User: postgres
-- =============================================================================
-- Guarda as "tabelas de cima" (compartilhadas):
--   - empresas  : registro de cada cliente (tenant) + qual é o banco dele
--   - usuarios  : LOGIN de TODOS os usuários (roteia para o banco da empresa)
-- Os dados operacionais (OS, ativos, estoque...) ficam em UM BANCO POR EMPRESA,
-- criado no cadastro a partir de tenant_template.sql.
--
-- COMO SUBIR:
--   1) CREATE DATABASE lizzi_facilities WITH ENCODING 'UTF8' TEMPLATE template0;  (fora de transação)
--   2) psql "postgresql://postgres:38653084@46.202.147.162:5432/lizzi_facilities" -f central.sql
-- =============================================================================

BEGIN;

-- Atualiza updated_at automaticamente
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------------------------------
-- empresas (tenants) — uma linha por cliente
-- -----------------------------------------------------------------------------
CREATE TABLE empresas (
  id          BIGSERIAL PRIMARY KEY,
  nome        VARCHAR(150) NOT NULL,
  documento   VARCHAR(20),
  email       VARCHAR(150),
  telefone    VARCHAR(20),
  whatsapp    VARCHAR(20),
  logo_url    VARCHAR(255),
  plano       VARCHAR(20) NOT NULL DEFAULT 'simples' CHECK (plano IN ('simples','premium')),
  status      VARCHAR(20) NOT NULL DEFAULT 'ativo'   CHECK (status IN ('ativo','inativo')),
  db_nome     VARCHAR(63),   -- nome do banco PostgreSQL do cliente (ex.: lizzi_emp_1)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);
CREATE UNIQUE INDEX uq_empresas_db_nome ON empresas(db_nome) WHERE db_nome IS NOT NULL;
CREATE TRIGGER trg_upd_empresas BEFORE UPDATE ON empresas
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- -----------------------------------------------------------------------------
-- usuarios — LOGIN central de todos os usuários
--   - empresa_id NULL  => admin_geral (acessa todas as empresas)
--   - no login: acha o usuário por email -> empresa_id -> empresas.db_nome
--     e o token passa a carregar { id, empresa_id, db_nome, perfil }
-- -----------------------------------------------------------------------------
CREATE TABLE usuarios (
  id          BIGSERIAL PRIMARY KEY,
  empresa_id  BIGINT REFERENCES empresas(id),
  nome        VARCHAR(150) NOT NULL,
  email       VARCHAR(150) NOT NULL,
  telefone    VARCHAR(20),
  whatsapp    VARCHAR(20),
  senha_hash  VARCHAR(255) NOT NULL,
  perfil          VARCHAR(20)  NOT NULL CHECK (perfil IN ('admin_geral','admin_empresa','supervisor','tecnico','solicitante')),
  status          VARCHAR(20)  NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo')),
  token           VARCHAR(255),         -- token de sessão (auth por token em tabela)
  token_expira_em TIMESTAMPTZ,          -- validade do token
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);
CREATE INDEX        idx_usuarios_empresa ON usuarios(empresa_id);
CREATE INDEX        idx_usuarios_token   ON usuarios(token);
CREATE UNIQUE INDEX uq_usuarios_email    ON usuarios(email) WHERE deleted_at IS NULL;
CREATE TRIGGER trg_upd_usuarios BEFORE UPDATE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- SEED — acesso inicial (admin_geral). Senha: lizzi123 (hash bcrypt, troque!)
-- =============================================================================
INSERT INTO usuarios (empresa_id, nome, email, senha_hash, perfil, status)
VALUES (NULL, 'Admin Geral', 'admingeral@lizzi.com',
        '$2b$10$/JQxQeDIqPNqKv0mzGVfRedR4b5TK9gDpcLstBAmjsXQuNxhVDofq',
        'admin_geral', 'ativo');

-- (DEMO opcional) empresa de exemplo já apontando para o banco lizzi_emp_1:
-- INSERT INTO empresas (id, nome, plano, status, db_nome)
--   VALUES (1, 'Empresa Demo Lizzi', 'premium', 'ativo', 'lizzi_emp_1');
-- INSERT INTO usuarios (empresa_id, nome, email, senha_hash, perfil)
--   VALUES (1, 'Admin Empresa', 'admin@demo.com',
--           '$2b$10$/JQxQeDIqPNqKv0mzGVfRedR4b5TK9gDpcLstBAmjsXQuNxhVDofq', 'admin_empresa');
-- SELECT setval('empresas_id_seq', (SELECT MAX(id) FROM empresas));

COMMIT;
