-- Libera os tipos de chamado para usar os cadastros da tela Cadastros > Tipos de chamado.
-- Rodar em cada banco tenant lizzi_emp_* existente.

ALTER TABLE ordens_servico
  DROP CONSTRAINT IF EXISTS ordens_servico_tipo_os_check;

ALTER TABLE ordens_servico
  ALTER COLUMN tipo_os TYPE VARCHAR(150);
