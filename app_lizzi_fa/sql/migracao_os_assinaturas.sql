-- Adiciona URLs das assinaturas capturadas na OS.
-- Rodar dentro de cada banco de empresa (lizzi_emp_<id>).

ALTER TABLE ordens_servico
  ADD COLUMN IF NOT EXISTS assinatura_tecnico_url VARCHAR(255),
  ADD COLUMN IF NOT EXISTS assinatura_cliente_url VARCHAR(255);
