-- =============================================================================
-- MIGRAÇÃO — adiciona auth por TOKEN EM TABELA ao banco CENTRAL já existente
-- Rodar no banco lizzi_facilities (já no ar):
--   psql "postgresql://postgres:38653084@46.202.147.162:5432/lizzi_facilities" -f migration_usuarios_token.sql
-- =============================================================================

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS token            VARCHAR(255);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS token_expira_em  TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_usuarios_token ON usuarios(token);
