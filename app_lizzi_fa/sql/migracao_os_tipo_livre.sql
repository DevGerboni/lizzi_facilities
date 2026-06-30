-- =============================================================================
-- Migração: TIPO DE CHAMADO livre (qualquer tipo cadastrado), não só
-- 'corretiva'/'preventiva'. Remove o CHECK antigo e amplia a coluna.
-- Rode UMA VEZ em CADA banco de empresa (lizzi_emp_<id>).
-- =============================================================================
ALTER TABLE ordens_servico DROP CONSTRAINT IF EXISTS ordens_servico_tipo_os_check;
ALTER TABLE ordens_servico ALTER COLUMN tipo_os TYPE VARCHAR(150);
