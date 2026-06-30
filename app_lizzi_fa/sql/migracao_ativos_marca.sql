-- Adiciona marca aos equipamentos existentes.
-- Rodar dentro de cada banco de empresa (lizzi_emp_<id>).

ALTER TABLE ativos
  ADD COLUMN IF NOT EXISTS marca VARCHAR(100);
