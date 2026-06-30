# LIZZI FACILITIES — Documento Único de Desenvolvimento (MVP)

> Documento consolidado a partir de **"Lizzi Facilities — Especificação do MVP"** e
> **"Regras Obrigatórias de Desenvolvimento"**. É a fonte única para o desenvolvimento do MVP.
> Antes de codar qualquer item, ler as seções **2 (Regras)**, **8 (Multi-tenant)** e
> **12 (Pontos de dúvida)**.

---

## 0. Como usar este documento

- **Seção 2** = regras inegociáveis. Qualquer PR que as viole deve ser rejeitado.
- **Seção 6** = modelo de dados oficial. Não criar tabela/campo fora dele sem antes verificar o banco (Regra 4) e registrar a necessidade.
- **Seção 12** = dúvidas em aberto. Pela **Regra 15**, itens marcados como 🟥 **BLOQUEANTE** devem ser respondidos pelo cliente **antes** de implementar a funcionalidade correspondente.

---

## 1. Visão geral e objetivo

**Lizzi Facilities** é uma plataforma **SaaS** para **gestão de manutenção e ativos**, focada em:
**simplicidade, velocidade de uso e baixo custo de implantação**.

Público-alvo: pequenas e médias empresas que precisam controlar chamados, equipamentos e
manutenções **sem sistemas complexos**.

Meta de UX: o usuário deve **aprender a usar em menos de 10 minutos**. Telas limpas, poucos
botões, poucos campos, responsivas.

O sistema tem **dois módulos/planos**:

| Plano | Foco |
|---|---|
| **Simples** | Abertura e execução de Ordens de Serviço (OS) |
| **Premium** | Tudo do Simples + Ativos, QR Code, Checklist, Estoque, Dashboard |

---

## 2. Regras obrigatórias (inegociáveis)

### 2.1 Regras de produto/código
1. **Não criar funcionalidades fora do escopo** descrito neste documento.
2. **Não inventar regras de negócio.** Dúvida → Seção 12 / perguntar.
3. **Não alterar estrutura já existente sem necessidade.**
4. **Sempre verificar o banco antes de criar tabela nova.**
5. **Reutilizar tabelas, campos e funções existentes** sempre que possível.
6. **Separar regras do Plano Simples e do Plano Premium** (ver Seção 5).
7. **Respeitar Multi-Tenant em todos os dados** (Seção 8).
8. **Nunca permitir que uma empresa acesse dados de outra.**
9. **Toda operação roda conectada ao banco da empresa logada** (modelo *1 banco por cliente* — ver Seção 3.3/D13).
10. **Cada empresa tem seu próprio banco**; o banco central guarda apenas `empresas` e `usuarios` (login).
11. **Toda criação, alteração e exclusão lógica deve gerar log.**
12. **Não excluir dados fisicamente — usar `deleted_at` (soft delete).**
13. **Código simples, direto e fácil de manter.**
14. **Não usar arquitetura complexa.**
15. **Em caso de dúvida, parar e listar os pontos de dúvida antes de implementar.**

### 2.2 Regras de banco de dados
> **Modelo definido (D13): 1 banco por cliente.** As regras 1 e 2 abaixo, originalmente sobre `tenant_id`, foram substituídas pelo isolamento por banco. As demais permanecem.
1. Os dados operacionais ficam **no banco da empresa** (sem `tenant_id`); o banco central guarda só `empresas` e `usuarios`.
2. Toda consulta operacional roda **conectada ao banco da empresa** resolvido no login (`empresas.db_nome`).
3. Usar `created_at`, `updated_at` e `deleted_at`.
4. Não deletar registros fisicamente.
5. Toda OS deve gerar histórico.
6. Toda mudança de status da OS deve registrar em `os_historico`.
7. Toda imagem da OS deve ser salva em `os_imagens`.
8. Todo material usado em OS deve gerar saída em `materiais_movimentacoes`.
9. Todo ativo deve pertencer obrigatoriamente a **unidade, piso e local**.
10. Todo técnico só pode receber OS de unidades associadas a ele (`tecnicos_unidades`).
11. Checklist do Premium é carregado pela **categoria do ativo**.
12. Plano Simples **não** deve obrigar ativo.
13. Plano Premium permite OS **por ativo OU por local**.
14. O **código da OS é sequencial por empresa** (via `SEQUENCE` própria do banco da empresa).
15. `admin_geral` acessa todos os tenants; demais usuários só o próprio tenant.
16. Campos de imagem armazenam **apenas o caminho/URL** do arquivo (Regra 17 do doc original).
17. **Senhas com hash** (`senha_hash`); nunca em texto puro.
18. **Toda API valida autenticação** antes de qualquer ação.

---

## 3. Arquitetura

### 3.1 Backend
- **PHP puro** (sem frameworks complexos).
- **Banco PostgreSQL** acessado via **PDO** (driver `pdo_pgsql`), sempre com **prepared statements**.
- **Cada funcionalidade em seu próprio arquivo PHP** (um endpoint = um arquivo).
- **Banco parametrizado por um único arquivo de configuração** (`config.php` com host, porta, base, usuário, senha — ver `database.md`).
- Código simples e organizado, **preparado para manutenção futura**.
- **Endpoint de produção:** `https://alexios.com.br/app_lizzi_fa/`

### 3.2 Frontend
- **React.**
- Interface **extremamente simples e intuitiva**.
- Identidade visual seguindo o padrão do projeto `/projetos_agentes_ia`.
- **Paleta:** Azul + Branco. Interface limpa, poucos botões, poucos campos.

### 3.3 Multi-Tenant
- **Estratégia definida (resolve D13): 1 banco por cliente** (mesmo conceito do `/projetos_agentes_ia_back`).
- **Banco central** `lizzi_facilities`: tabelas `empresas` (tenants) e `usuarios` (login de todos).
- **Banco por empresa** `lizzi_emp_<id>`: criado **no cadastro**, com todas as tabelas operacionais (**sem `tenant_id`**).
- **Login é central** e roteia: descobre `empresas.db_nome` e o backend conecta no banco da empresa.
- **Isolamento total** entre empresas: cada uma tem seu próprio banco. Detalhes e SQL em [database.md](lizzi_facilities/database.md).

### 3.4 Convenções sugeridas de API (para padronizar — confirmar na Seção 12)
> Detalhe técnico de implementação, não regra de negócio.
- Respostas em **JSON**: `{ "success": bool, "data": ..., "message": "..." }` (em erros, `error: true`).
- Autenticação por **token** enviado em header `Authorization: Bearer <token>`, validado em **todo** arquivo PHP por um helper comum (`core/auth.php`) — Regra 18. *(Mecanismo exato — JWT vs. token em tabela — e expiração: ver dúvida D1.)*
- **Todo arquivo PHP** segue a cadeia: (1) valida auth → (2) lê `db_nome` do token (nunca do corpo da requisição) → (3) **conecta no banco da empresa** e roda as queries lá (sem `tenant_id`).
- Datas em ISO 8601; valores monetários como `NUMERIC`/decimal.

### 3.5 Estrutura de pastas sugerida (backend PHP)
> Servido em `https://alexios.com.br/app_lizzi_fa/`. Um arquivo por funcionalidade; `core/` concentra os helpers comuns.
```
/app_lizzi_fa
  config.php                 # única configuração de banco/ambiente (ver database.md)
  /core
    auth.php                 # validação de autenticação/token (Regra 18)
    db.php                   # conexão PDO (PostgreSQL) + helpers
    tenant.php               # resolução do tenant do usuário logado
    log.php                  # gravação de log (Regra 11)
    response.php             # padrão de resposta JSON
  /os
    os_criar.php
    os_listar.php
    os_detalhe.php
    os_atualizar_status.php
    os_executar.php
    os_enviar_whatsapp.php
    os_pdf.php
  /cadastros
    unidade_*.php  piso_*.php  local_*.php  tecnico_*.php  categoria_*.php  ...
  /ativos          (Premium)
  /checklist       (Premium)
  /estoque         (Premium)
  /dashboard       (Premium)
  /config_empresa
  /uploads                   # arquivos enviados; só o caminho/URL vai pro banco
```
> Um arquivo por funcionalidade (Regra do MVP). Nomes no padrão `entidade_acao.php`.

### 3.6 Stack e dependências (PHP)

| Necessidade | Recurso/biblioteca |
|---|---|
| Linguagem | **PHP puro** (≥ 8.x recomendado) |
| Banco | **PostgreSQL** via **PDO** (`pdo_pgsql`) |
| Hash de senha | `password_hash` / `password_verify` (bcrypt nativo do PHP) |
| Autenticação (token) | nativo ou `firebase/php-jwt` *(definir em D1)* |
| Upload de arquivos | nativo (`$_FILES` + `move_uploaded_file`); salva só o caminho/URL |
| Cliente HTTP (chamar webhook do N8N) | `cURL` nativo |
| **WhatsApp (orquestração + envio)** | **N8N** + **Evolution API** (serviços externos; o PHP só faz `POST` no webhook do N8N — ver 7.4/D4) |
| Geração de PDF da OS | `dompdf` ou `tecnickcom/tcpdf` *(ver D8)* |
| QR Code dos ativos (Premium) | `endroid/qr-code` *(ver D9)* |

---

## 4. Perfis e matriz de permissões

| Perfil | Escopo |
|---|---|
| **admin_geral** | Controla **todas** as empresas; cria planos; acompanha utilização; gerencia clientes; personaliza o sistema |
| **admin_empresa** | Controla **apenas a sua** empresa |
| **supervisor** | Acompanha chamados |
| **tecnico** | Executa chamados (só de unidades associadas a ele) |
| **solicitante** | Cria chamados |

**Matriz de acesso (proposta inicial — confirmar limites finos na Seção 12, D7):**

| Ação | admin_geral | admin_empresa | supervisor | tecnico | solicitante |
|---|:---:|:---:|:---:|:---:|:---:|
| Acessar múltiplos tenants | ✅ | ❌ | ❌ | ❌ | ❌ |
| Cadastros base (unidade/piso/local/técnico) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Criar OS | ✅ | ✅ | ✅ | ✅ | ✅ |
| Executar OS / mudar status | ✅ | ✅ | ✅ | ✅* | ❌ |
| Ver dashboard (Premium) | ✅ | ✅ | ✅ | ❌ | ❌ |
| Cadastrar ativos/estoque (Premium) | ✅ | ✅ | ❌ | ❌ | ❌ |
| Personalização da empresa | ✅ | ✅ | ❌ | ❌ | ❌ |

\* técnico só executa OS de unidades às quais está associado (`tecnicos_unidades`).

---

## 5. Escopo por plano

| Funcionalidade | Simples | Premium |
|---|:---:|:---:|
| Cadastro: Empresa, Unidade, Piso, Local, Técnicos, Clientes | ✅ | ✅ |
| Abertura de OS (corretiva/preventiva, prioridade, avaria, imagens, anexos) | ✅ | ✅ |
| Agendamento (técnico/data/hora ou execução imediata) | ✅ | ✅ |
| Envio por WhatsApp (técnico/cliente) | ✅ | ✅ |
| Execução da OS + status + tempos automáticos | ✅ | ✅ |
| Histórico de alterações | ✅ | ✅ |
| **OS obrigatoriamente por ativo** | ❌ (não obrigar ativo) | ➕ permite por **ativo ou local** |
| **Cadastro de Ativos + QR Code** | ❌ | ✅ |
| **Checklist por categoria** | ❌ | ✅ |
| **Estoque (materiais + movimentações)** | ❌ | ✅ |
| **Dashboard de indicadores** | ❌ | ✅ |
| **Personalização visual + PDF da OS** | ⚠️ (ver D8) | ✅ |

> O plano vigente da empresa está em `tenants.plano`. O **gating** de funcionalidades
> Premium deve ser verificado no backend (não só no frontend).

---

## 6. Modelo de dados

> ⚠️ **Modelo 1 banco por cliente (D13).** O schema **real e autoritativo** está em
> [database.md](lizzi_facilities/database.md) + [central.sql](lizzi_facilities/central.sql) + [tenant_template.sql](lizzi_facilities/tenant_template.sql).
> A divisão das tabelas abaixo:
> - **Banco central** (`lizzi_facilities`): **6.1 `tenants` → renomeada para `empresas`** (ganha `db_nome`) e **6.2 `users` → renomeada para `usuarios`** (ganha `empresa_id`; sem `tenant_id`).
> - **Banco de cada empresa** (`lizzi_emp_<id>`): tabelas **6.3 a 6.17**, que **NÃO têm `tenant_id`** (o banco já isola a empresa). As referências a usuário (`solicitante_id`, `tecnico_id`, `usuario_id`) são `BIGINT` apontando para `usuarios.id` do central, **sem FK**.
>
> Padrão por tabela: PK `id BIGSERIAL`; `created_at`/`updated_at` (`TIMESTAMPTZ DEFAULT now()`), `deleted_at TIMESTAMPTZ NULL` (soft delete); índices nas FKs; monetário `NUMERIC(12,2)`; enums via `VARCHAR + CHECK`. **Ignore o `tenant_id` listado nos resumos 6.3–6.17 abaixo** (legado do modelo anterior).

### 6.1 `tenants` — Empresas/clientes do sistema
`id` · `nome` · `documento` · `email` · `telefone` · `whatsapp` · `logo_url` · `plano` · `status` · `created_at` · `updated_at` · `deleted_at`
- `plano` ∈ { `simples`, `premium` } *(confirmar nomes — D5)*
- `status` ∈ { `ativo`, `inativo` }

### 6.2 `users` — Usuários
`id` · `tenant_id` · `nome` · `email` · `telefone` · `whatsapp` · `senha_hash` · `perfil` · `status` · `created_at` · `updated_at` · `deleted_at`
- `perfil` ∈ { `admin_geral`, `admin_empresa`, `supervisor`, `tecnico`, `solicitante` }
- `admin_geral` pode ter `tenant_id` nulo/global *(confirmar — D6)*

### 6.3 `unidades`
`id` · `tenant_id` · `nome` · `endereco` · `status` · `created_at` · `updated_at` · `deleted_at`

### 6.4 `pisos` (vinculados à unidade)
`id` · `tenant_id` · `unidade_id` · `nome` · `status` · `created_at` · `updated_at` · `deleted_at`

### 6.5 `locais` (vinculados ao piso)
`id` · `tenant_id` · `unidade_id` · `piso_id` · `nome` · `status` · `created_at` · `updated_at` · `deleted_at`

### 6.6 `categorias` (de ativos/chamados)
`id` · `tenant_id` · `nome` · `tipo` · `status` · `created_at` · `updated_at` · `deleted_at`
- `tipo` ∈ { `ativo`, `chamado`, `ambos` }

### 6.7 `ativos` (Premium)
`id` · `tenant_id` · `unidade_id` · `piso_id` · `local_id` · `categoria_id` · `nome` · `patrimonio` · `fabricante` · `modelo` · `numero_serie` · `qr_code` · `foto_url` · `status` · `created_at` · `updated_at` · `deleted_at`
- Todo ativo **deve** ter unidade + piso + local (Regra DB 9).

### 6.8 `tecnicos_unidades` (técnico ↔ unidade)
`id` · `tenant_id` · `tecnico_id` (FK → users) · `unidade_id` · `created_at`

### 6.9 `ordens_servico`
`id` · `tenant_id` · `codigo` · `unidade_id` · `piso_id` · `local_id` · `ativo_id` (NULL no Simples) · `solicitante_id` · `tecnico_id` · `tipo_os` · `prioridade` · `avaria` · `descricao` · `observacao` · `data_agendada` · `hora_agendada` · `status` · `inicio_atendimento` · `fim_atendimento` · `tempo_total_minutos` · `created_at` · `updated_at` · `deleted_at`
- `tipo_os` ∈ { `corretiva`, `preventiva` }
- `prioridade` ∈ { `baixa`, `media`, `alta`, `urgente` }
- `status` ∈ { `aberto`, `em_andamento`, `interrompido`, `aguardando_aprovacao`, `concluido`, `cancelado` }
- `codigo`: **sequencial no banco da empresa** via `SEQUENCE os_codigo_seq` (Regra DB 14).

### 6.10 `os_imagens`
`id` · `tenant_id` · `ordem_servico_id` · `imagem_url` · `tipo` · `created_at`
- `tipo` ∈ { `abertura`, `execucao`, `conclusao` }

### 6.11 `os_historico`
`id` · `tenant_id` · `ordem_servico_id` · `usuario_id` · `acao` · `status_anterior` · `status_novo` · `observacao` · `created_at`

### 6.12 `checklist_modelos` (Premium)
`id` · `tenant_id` · `categoria_id` · `nome` · `status` · `created_at` · `updated_at` · `deleted_at`

### 6.13 `checklist_itens` (Premium)
`id` · `tenant_id` · `checklist_modelo_id` · `descricao` · `obrigatorio` · `exige_foto` · `exige_observacao` · `ordem` · `status` · `created_at` · `updated_at` · `deleted_at`

### 6.14 `os_checklist_respostas` (Premium)
`id` · `tenant_id` · `ordem_servico_id` · `checklist_item_id` · `marcado` · `observacao` · `imagem_url` · `usuario_id` · `created_at`

### 6.15 `materiais` (Premium)
`id` · `tenant_id` · `nome` · `codigo` · `unidade_medida` · `quantidade_atual` · `valor_unitario` · `status` · `created_at` · `updated_at` · `deleted_at`

### 6.16 `materiais_movimentacoes` (Premium)
`id` · `tenant_id` · `material_id` · `ordem_servico_id` · `tipo` · `quantidade` · `valor_unitario` · `valor_total` · `usuario_id` · `observacao` · `created_at`
- `tipo` ∈ { `entrada`, `saida` }
- Toda baixa de material em OS gera registro `saida` (Regra DB 8).

### 6.17 `configuracoes_empresa`
`id` · `tenant_id` · `nome_fantasia` · `razao_social` · `documento` · `endereco` · `telefone` · `whatsapp` · `email` · `logo_url` · `cor_primaria` · `cor_secundaria` · `whatsapp_numero` · `whatsapp_instancia` · `whatsapp_ativo` · `created_at` · `updated_at`
- `whatsapp` = número de **contato/exibição** da empresa (já existente).
- **WhatsApp por cliente (N8N):**
  - `whatsapp_numero` = número de **origem/envio** próprio do tenant (de onde as mensagens da OS saem).
  - `whatsapp_instancia` = nome/ID da **instância na Evolution API** desse número (chave de roteamento usada pelo N8N).
  - `whatsapp_ativo` (boolean) = liga/desliga o envio automático para o tenant.
- A URL do webhook e o segredo do N8N são **globais** (`config.php`); o que é **por tenant** são estes campos (Seção 7.4).

### 6.18 Relacionamentos (resumo)
```
tenants 1──N users / unidades / categorias / materiais / ordens_servico / configuracoes_empresa
unidades 1──N pisos 1──N locais
unidades/pisos/locais/categorias 1──N ativos              (Premium)
users(tecnico) N──N unidades  (via tecnicos_unidades)
ordens_servico 1──N os_imagens / os_historico / os_checklist_respostas / materiais_movimentacoes
categorias 1──N checklist_modelos 1──N checklist_itens     (Premium)
```

> ⚠️ **Tabelas citadas no MVP mas ausentes no schema:** *Clientes* e *Anexos*. Ver dúvidas **D2** e **D3** antes de implementar.

---

## 7. Funcionalidades detalhadas

### 7.1 Cadastros base (Simples e Premium)
Empresa, Unidade, Piso, Local, Técnicos, Clientes. CRUD com soft delete e log.
- Hierarquia obrigatória: **Unidade → Piso → Local**.
- "Clientes": ver **D2** (entidade própria vs. usuário `solicitante`).

### 7.2 Ordem de Serviço — ciclo de vida
**Campos obrigatórios na abertura:** Unidade, Piso, Local, Tipo.
Demais: Prioridade, Descrição da avaria, Observações, Imagens, Anexos, Data, Hora, Responsável.
- Premium: pode amarrar a um **ativo** (OS por ativo ou por local).
- `codigo` gerado **sequencial por empresa**.
- **Status:** `aberto → em_andamento → (interrompido) → aguardando_aprovacao → concluido` (+ `cancelado`).
- **Registrar automaticamente:** `inicio_atendimento` (data+hora início), `fim_atendimento` (data+hora término), `tempo_total_minutos`.
- **Toda** mudança de status grava em `os_historico` (quem, quando, o quê, status anterior/novo).
- **Toda** imagem grava em `os_imagens` com `tipo` (abertura/execução/conclusão).

### 7.3 Agendamento
Ao criar a OS, duas opções:
1. **Agendar para um técnico** → selecionar técnico + data + horário.
2. **Executar imediatamente.**
- Se **nenhum técnico** for selecionado, a OS é atribuída **automaticamente ao usuário responsável**.

### 7.4 WhatsApp (via N8N — número por cliente)
Após criar a OS, opção de **Enviar para Técnico** ou **Enviar para Cliente**.
A mensagem deve conter **todas as informações da OS**.

**Integração definida (resolve D4):** o envio é feito pelo **N8N + Evolution API**.
O backend **não fala direto com a API do WhatsApp** — o arquivo `os_enviar_whatsapp.php` apenas faz `POST` (via **cURL**) para o **webhook do N8N**,
e o N8N envia pela **Evolution API**. O provedor de WhatsApp por trás do N8N é a **Evolution API**.

**Número por cliente (multi-tenant):** cada empresa (tenant) tem a **sua própria instância na Evolution API** (um número por cliente),
configurada por cliente em `configuracoes_empresa` (campos `whatsapp_numero`, `whatsapp_instancia`, `whatsapp_ativo` — Seção 6.17).
O `whatsapp_instancia` é o **nome/ID da instância na Evolution API** daquele cliente.
O envio é **direcionado**: a mensagem de uma empresa sai **do número dela**, nunca de um número compartilhado.

**Fluxo de envio:**
1. Usuário aciona "Enviar para Técnico/Cliente" numa OS.
2. Backend resolve a empresa (do token) e lê a config de WhatsApp **no banco da empresa**.
3. Backend faz `POST` no webhook do N8N com o payload:
   ```json
   {
     "empresa_id": 123,
     "whatsapp_instancia": "<instância/sessão do número do cliente>",
     "from": "<whatsapp_numero do tenant>",
     "to": "<número do destinatário: técnico ou cliente>",
     "tipo": "tecnico | cliente",
     "ordem_servico_id": 456,
     "mensagem": "<todas as informações da OS formatadas>"
   }
   ```
4. O N8N usa `empresa_id`/`whatsapp_instancia` para escolher o número de origem correto e envia.
5. Webhook protegido por segredo compartilhado (`n8n_webhook_secret` no `config.php`); URL em `n8n_whatsapp_webhook_url`.

> Pré-requisito: cada cliente precisa ter sua **instância na Evolution API** criada/conectada (QR Code) **e** registrada em `configuracoes_empresa` (`whatsapp_instancia`/`whatsapp_numero`).
> Pontos finos remanescentes (onboarding/criação da instância, formato do `to`, retry/falha, confirmação de entrega): ver **D4**.

### 7.5 Checklist (Premium)
- Cada **categoria** possui um checklist próprio (`checklist_modelos` + `checklist_itens`).
- Ao abrir a OS, o checklist é **carregado automaticamente conforme a categoria do ativo**.
- Itens podem ser `obrigatorio`, `exige_foto`, `exige_observacao`. Respostas em `os_checklist_respostas`.
- Exemplos do edital: Ar Condicionado (desligou energia, limpou filtro, testou compressor, testou ventilador, funcionando); Iluminação; Porta.

### 7.6 Ativos + QR Code (Premium)
- Cadastro de ativos (Seção 6.7).
- Geração de `qr_code` por ativo.
- Ao **escanear o QR Code**, abrir automaticamente a tela do ativo permitindo: ver histórico, criar chamado, consultar manutenções, ver fotos.
- Biblioteca de QR e formato do conteúdo: **D9**.

### 7.7 Estoque (Premium)
- Cadastro de materiais; controle de **entrada** e **saída**.
- Cada item utilizado fica **vinculado à OS** (`materiais_movimentacoes.ordem_servico_id`).
- Atualizar `quantidade_atual` a cada movimentação.

### 7.8 Dashboard (Premium) — indicadores
Quantidade de OS · OS corretivas · OS preventivas · OS em andamento · OS concluídas ·
OS interrompidas · **tempo médio** · chamados por técnico · chamados por unidade.
- Todos os números vêm **do banco da empresa** (isolados pelo próprio banco).

### 7.9 Personalização + PDF
- Cada empresa cadastra: logotipo, nome, endereço, WhatsApp, e-mail, cores (`configuracoes_empresa`).
- Esses dados aparecem automaticamente nas OS.
- **PDF da OS** contendo: Empresa, Endereço, Telefone, WhatsApp, Cliente, Telefone, Data,
  Itens utilizados (qtd, valor unit., valor total), Forma de pagamento, Total,
  Assinatura do técnico, Assinatura do cliente.
- Origem de **forma de pagamento/valores** e **assinaturas**: **D8 / D10**.

---

## 8. Multi-tenant — checklist de enforcement (obrigatório em cada arquivo PHP)
1. ✅ Autenticar (Regra 18) via `core/auth.php` antes de qualquer ação.
2. ✅ Ler o `db_nome` do **token** (resolvido no login a partir de `empresas`) — nunca aceitar banco/empresa vindo do corpo/cliente.
3. ✅ **Conectar no banco da empresa** (`core/tenant.php` → `conectarTenant($db_nome)`) e rodar as queries lá (sem `tenant_id`).
4. ✅ `admin_geral` (`empresa_id` NULL) é a **única** exceção que pode acessar/escolher outros bancos (Regra DB 15).
5. ✅ Nunca conectar num banco que não seja o da empresa do usuário logado.
6. ✅ Validar que o recurso (por ID) existe **no banco da empresa** antes de expor/alterar.

---

## 9. Segurança
- Senhas com **hash** (`password_hash`/`password_verify` — bcrypt nativo do PHP); nunca texto puro.
- Autenticação validada em **toda** API por `core/auth.php`; segredo/token em `config.php` (nunca versionado).
- Acesso ao banco sempre via **PDO + prepared statements** (previne SQL injection).
- Uploads (`$_FILES` + `move_uploaded_file`): salvar **somente o caminho/URL**; validar tipo/tamanho de arquivo.
- Soft delete sempre (`deleted_at`); nada é apagado fisicamente.
- Log de toda criação/alteração/exclusão lógica (Regra 11) — incluindo quem e quando.

---

## 10. Critérios de aceitação (Definition of Done)
- [ ] Nenhuma funcionalidade fora do escopo (Seção 5).
- [ ] Banco central (`empresas`/`usuarios`) + 1 banco por empresa criado no cadastro; tabelas operacionais com `created_at`/`updated_at`/`deleted_at`.
- [ ] Cada operação conecta no banco da empresa logada; isolamento entre empresas testado (empresa A não acessa o banco de B).
- [ ] Soft delete em todas as exclusões.
- [ ] OS gera histórico em toda mudança de status; tempos calculados automaticamente.
- [ ] Imagens da OS em `os_imagens`; materiais usados geram `saida` em `materiais_movimentacoes`.
- [ ] Código da OS sequencial por empresa.
- [ ] Plano Simples não obriga ativo; Premium permite OS por ativo ou local.
- [ ] Checklist Premium carregado pela categoria do ativo.
- [ ] Autenticação validada em todos os endpoints; senhas com hash.
- [ ] Frontend React simples (azul/branco), responsivo, curva de aprendizado < 10 min.
- [ ] Backend **PHP puro**: um arquivo por funcionalidade, config único (`config.php`).
- [ ] Banco **PostgreSQL** (`lizzi_facilities`) via PDO; sem dependência de MySQL.

---

## 11. Roadmap de implementação sugerido (ordem)
1. **Fundação:** `config.php`, `core/db.php` (PDO no central), `core/tenant.php` (conexão dinâmica por empresa + criação de banco no cadastro), `core/auth.php`, `core/log.php`, `core/response.php`.
2. **Bancos** — rodar [central.sql](lizzi_facilities/central.sql) (cria `empresas`/`usuarios` + `admin_geral`); o `tenant_template.sql` é aplicado a cada empresa nova no cadastro.
3. **Cadastros base:** unidades, pisos, locais, técnicos, (clientes — após D2).
4. **OS (Plano Simples):** criação, agendamento, execução, status, histórico, imagens.
5. **WhatsApp via N8N** (config de número/instância por cliente em `configuracoes_empresa` + `POST` no webhook do N8N) e **PDF/personalização** (após D8/D10).
6. **Premium:** ativos + QR Code → checklist → estoque → dashboard.
7. **Painel admin_geral** (gestão de tenants/planos).

---

## 12. Pontos de dúvida a resolver ANTES de implementar (Regra 15)

> 🟥 = bloqueante (não implementar a parte afetada sem resposta). 🟨 = recomendável definir cedo.

- **D1 ✅ — Autenticação: RESOLVIDO.** **Token em tabela**: no login gera token aleatório salvo em `usuarios.token` (+ `token_expira_em`, validade 7 dias) no banco central; cada request valida o token no central e resolve `empresa_id`/`db_nome`. Token no header `Authorization: Bearer`. Implementado em `core/auth.php`.
- **D2 🟥 — "Clientes":** o MVP lista "Clientes" como cadastro, mas o schema **não tem tabela `clientes`** e há o perfil `solicitante`. Cliente é (a) um `user` com perfil `solicitante`, (b) uma entidade própria nova, ou (c) reutiliza outra tabela? Afeta OS (`solicitante_id`) e o PDF ("Cliente/Telefone").
- **D3 🟨 — "Anexos":** a abertura de OS cita "Anexos" além de "Imagens", mas só existe `os_imagens`. Criar tabela `os_anexos` (arquivos genéricos) ou tratar tudo como imagem?
- **D4 🟨 — WhatsApp (DEFINIDO: N8N + Evolution API):** integração via **N8N**, que envia pela **Evolution API**; o backend (PHP, via cURL) faz `POST` no webhook do N8N; envio direcionado pela **instância própria de cada cliente** na Evolution API, configurada em `configuracoes_empresa` (`whatsapp_instancia`/`whatsapp_numero` — Seções 7.4 e 6.17). Pontos finos a confirmar: **onde a Evolution API está hospedada** e como é o **onboarding** (criar instância + conectar via QR Code) de cada cliente; **formato do destinatário** (`to`) e templates; **falha/retry** e se há confirmação de entrega de volta ao backend (webhook de status da Evolution → N8N → backend).
- **D5 🟨 — Valores de `plano`:** confirmar strings (`simples`/`premium`) e como o `admin_geral` "cria planos" (planos fixos no código ou tabela `planos`?).
- **D6 ✅ — `admin_geral`:** RESOLVIDO. Fica no banco **central** com `empresa_id` NULL e pode conectar em qualquer banco de empresa.
- **D7 🟨 — Permissões finas:** supervisor pode mudar status/cancelar OS? Solicitante pode editar a própria OS após abrir? (matriz da Seção 4 é proposta).
- **D8 🟥 — Valores/pagamento no PDF:** "Forma de pagamento", "Valor unitário/total", "Total" — de onde vêm? Há precificação de serviço/mão de obra (não há tabela para isso) ou só soma dos materiais? Premium só, ou Simples também gera PDF?
- **D9 🟨 — QR Code:** biblioteca (ex.: `endroid/qr-code` no PHP) e conteúdo do QR (URL para tela do ativo? id criptografado?). Como o "escanear abre a tela" — app, câmera web, deep link?
- **D10 🟨 — Assinaturas no PDF:** assinatura digital capturada na tela (canvas) e salva como imagem, ou campo em branco para assinatura física?
- **D11 🟨 — Storage de arquivos:** disco local do servidor (pasta `uploads/` em `app_lizzi_fa/`) ou S3/CDN? (schema guarda só URL/caminho).
- **D12 🟨 — Identidade visual:** acesso ao projeto-referência `/projetos_agentes_ia` para replicar componentes/paleta?
- **D13 ✅ — Estratégia multi-tenant (banco): RESOLVIDO.** **1 banco por cliente**: banco central `lizzi_facilities` (`empresas` + `usuarios`) + um banco `lizzi_emp_<id>` por empresa criado no cadastro. SQL em [database.md](lizzi_facilities/database.md), [central.sql](lizzi_facilities/central.sql) e [tenant_template.sql](lizzi_facilities/tenant_template.sql).

---

### Resumo executivo
MVP **SaaS multi-tenant** de manutenção/ativos, **PHP puro + PostgreSQL + React**, dois planos,
hospedado em `https://alexios.com.br/app_lizzi_fa/`. Multi-tenant por **1 banco por cliente** (central
`lizzi_facilities` + um banco por empresa criado no cadastro). As regras inegociáveis são **isolamento
por banco, soft delete, log de tudo, separação Simples/Premium e simplicidade**. O SQL está em
[database.md](lizzi_facilities/database.md), [central.sql](lizzi_facilities/central.sql) e
[tenant_template.sql](lizzi_facilities/tenant_template.sql). As lacunas que restam (Clientes, Anexos,
valores/PDF, mecanismo de autenticação) estão na **Seção 12**.
