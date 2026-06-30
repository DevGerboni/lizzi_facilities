-- =============================================================================
-- Migração: tornar Unidade / Piso / Local OPCIONAIS na Ordem de Serviço.
-- Rode UMA VEZ em CADA banco de empresa (lizzi_emp_<id>).
-- As foreign keys continuam valendo — NULL é permitido por FK.
-- =============================================================================
ALTER TABLE ordens_servico ALTER COLUMN unidade_id DROP NOT NULL;
ALTER TABLE ordens_servico ALTER COLUMN piso_id    DROP NOT NULL;
ALTER TABLE ordens_servico ALTER COLUMN local_id   DROP NOT NULL;
