# TODO — Lizzi Facilities (MVP)

Data: 2026-06-28
Produto: **Lizzi Facilities** — SaaS multi-tenant de gestão de manutenção e ativos (planos **Simples** e **Premium**).
Fonte única de regras: [Lizzi-Facilities-DOC-DESENVOLVIMENTO.md](lizzi_facilities/Lizzi-Facilities-DOC-DESENVOLVIMENTO.md) · SQL: [database.md](lizzi_facilities/database.md).

> **Antes de codar qualquer item**, ler as Seções **2 (Regras)**, **8 (Multi-tenant)** e **12 (Dúvidas)** do DOC.
> Stack: **Backend PHP puro + PostgreSQL (PDO)** em `https://alexios.com.br/app_lizzi_fa/` · **Frontend React (azul/branco)** · **WhatsApp via N8N + Evolution API**.
> Identidade visual de referência: `projeto_agentes_ia/`.

**Legenda:** `[ ]` a fazer · `[x]` feito · 🟥 bloqueante (depende de resposta do cliente) · 🟨 definir cedo · (P) Premium.

> **STATUS (2026-06-28):** **Backend completo e TESTADO em produção (26/26 OK)** — auth, cadastros, OS (status/tempos/histórico), Premium (ativos+QR, checklist, estoque, dashboard), config, admin, usuários, WhatsApp (responde sem N8N). Testado via `admin_empresa` → `lizzi_emp_2`.
> ⚠️ **Deploy:** a app foi subida aninhada (`app_lizzi_fa/app_lizzi_fa/`) — mover o conteúdo 1 nível acima p/ ficar em `/app_lizzi_fa/`.
> ⚠️ `config.debug=true` (desligar no lançamento). Pendências: reset de senha, Clientes (D2), Anexos (D3), valores/assinatura PDF (D8/D10), URL do N8N (D4).
> **Frontend (React + TypeScript/CRA):** scaffold + landing **repaginada** (mockup de celular, depoimentos, WhatsApp flutuante, CNPJ, Privacidade/Termos), auth, auto-cadastro público, dashboard, unidades, OS. Responsivo. Build OK. **Falta:** demais cadastros/telas Premium/config/admin (replicar templates).
> **Próximo:** completar as telas restantes do app + subir backend (`cadastro_publico.php`) e frontend (`build/`).

---

## 🟥 0. Bloqueantes — resolver ANTES de implementar a parte afetada

> Dúvidas 🟥 da Seção 12 do DOC. Sem resposta, **não** começar a funcionalidade dependente.

- [x] ~~**D13 — Estratégia multi-tenant (banco)**~~ **RESOLVIDO:** **1 banco por cliente** (central `lizzi_facilities` + `lizzi_emp_<id>` criado no cadastro).
- [ ] **D2 — "Clientes":** é um `user` com perfil `solicitante`, uma entidade própria nova, ou reuso? Afeta OS (`solicitante_id`) e o PDF. → resolver antes da Fase 3.
- [ ] **D8 — Valores/pagamento no PDF:** "Forma de pagamento", "Valor unitário/total", "Total" vêm de quê? Só soma de materiais ou há mão de obra? Premium só ou Simples também? → resolver antes da Fase 6 (PDF).
- [x] ~~**D1 — Auth**~~ **RESOLVIDO:** token em tabela (`usuarios.token` + `token_expira_em`, 7 dias) no central; validado a cada request. Migração: `migration_usuarios_token.sql`.
- [ ] **D4 (parte) — WhatsApp:** host da Evolution API, onboarding da instância por cliente (criar + conectar QR), formato do `to`, retry/confirmação de entrega.

---

## 1. Fundação do backend (PHP puro)

> Estrutura da Seção 3.5 do DOC. Servido em `https://alexios.com.br/app_lizzi_fa/`. Um arquivo por funcionalidade; helpers comuns em `core/`. **Construído em [app_lizzi_fa/](lizzi_facilities/app_lizzi_fa/).**

- [x] `config.php` + `config.example.php` (banco/credenciais, `app_base_url`, N8N/Evolution). `.gitignore` exclui `config.php`.
- [x] `core/db.php` — `config()` + `dbCentral()` (PDO no central, prepared statements).
- [x] `core/auth.php` — token em tabela (`autenticar()`) + `exigirPerfil/Empresa/Premium`.
- [x] `core/tenant.php` — `conectarTenant($db_nome)` + `criarBancoEmpresa()` (`CREATE DATABASE` + roda `tenant_template.sql`).
- [x] `core/log.php` — `registrarLog()` (Regra 11; grava no banco da empresa).
- [x] `core/response.php` — `jsonResponse/jsonError/bodyJson/cors`.
- [x] `login.php` / `logout.php` + `.htaccess` (repassa `Authorization`).
- [x] `empresas/empresa_criar.php` — admin_geral cria empresa + banco da empresa.
- [ ] Upload via `$_FILES` + `move_uploaded_file` → `uploads/` (na fase de OS/imagens).

## 2. Banco de dados (PostgreSQL — 1 banco por cliente) — ver [database.md](lizzi_facilities/database.md)

> D13 resolvido: banco central + um banco por empresa. SQL: [central.sql](lizzi_facilities/central.sql) e [tenant_template.sql](lizzi_facilities/tenant_template.sql).

- [x] Escrever o SQL: `central.sql` (empresas/usuarios) + `tenant_template.sql` (operacional, sem `tenant_id`).
- [x] Criar o banco central e rodar `central.sql` (cria `admin_geral`). **(feito em produção)**
- [x] Migração do token no central (`token`/`token_expira_em`) — confirmado em produção.
- [x] Backend do **cadastro de empresa** (`empresas/empresa_criar.php`: INSERT em `empresas` → `CREATE DATABASE lizzi_emp_<id>` → roda `tenant_template.sql` → grava `db_nome`).
- [x] Trigger de `codigo` da OS validado (gerou `OS-000001`) + `updated_at` ok.
- [ ] (Após D2) `clientes` / (Após D3) `os_anexos` no `tenant_template.sql`, se confirmados.

## 3. Cadastros base (Simples + Premium)

> CRUD com soft delete + log. Hierarquia obrigatória: **Unidade → Piso → Local**.
> Convenção: cadastros simples = **1 arquivo por entidade** roteado por método HTTP (GET/POST/PUT/DELETE). OS = arquivos por ação.
> Helpers: `core/crud.php` (inserir/atualizar/softDelete/existe) + `contextoEmpresa()` (auth + conecta no banco da empresa).

- [x] Autenticação: `login.php` / `logout.php` (validado). Reset de senha: pendente.
- [x] `cadastros/unidades.php` (CRUD).
- [x] `cadastros/pisos.php` (CRUD, valida unidade).
- [x] `cadastros/locais.php` (CRUD, valida unidade+piso).
- [x] `cadastros/categorias.php` (CRUD).
- [x] `cadastros/tecnicos.php` (usuário central perfil 'tecnico' + vínculo `tecnicos_unidades`).
- [x] Cadastros testados em produção contra `lizzi_emp_2`.
- [ ] Clientes — após **D2**.

## 4. Ordem de Serviço — Plano Simples

> Ciclo de vida e regras: Seção 7.2 do DOC.

- [x] `os/os_criar.php` — obrigatórios: Unidade, Piso, Local, Tipo. `codigo` pelo trigger. Agendamento (técnico/data ou imediato) + histórico de abertura.
- [x] `os/os_atualizar_status.php` — transições + **tempos automáticos** (`inicio`/`fim`/`tempo_total_minutos`) + histórico (executar foi unificado aqui).
- [x] `os/os_imagens.php` — upload (`$_FILES`) + grava em `os_imagens` (abertura/execução/conclusão).
- [x] `os/os_listar.php` (escopo por perfil) + `os/os_detalhe.php` (imagens, histórico, checklist, materiais).
- [x] Testado em produção (26/26).

## 5. WhatsApp (N8N + Evolution API) — número por cliente

> Seção 7.4 do DOC. Backend só faz `POST` (cURL) no webhook do N8N; o N8N envia pela **Evolution API**, da **instância do tenant**.

- [x] Config de WhatsApp por empresa (em `config_empresa/configuracoes.php`).
- [x] `os/os_enviar_whatsapp.php` — monta a mensagem + `POST` (cURL) no N8N (`core/whatsapp.php`), tipo técnico/cliente.
- [ ] Configurar a URL/secret do N8N no `config.php` (hoje vazio → endpoint responde 409 "não configurado").
- [ ] (Após D4) Onboarding da instância na Evolution API por cliente + retry/confirmação de entrega.

## 6. Personalização + PDF da OS

> Seção 7.9 do DOC. Depende de **D8** (valores/pagamento) e **D10** (assinaturas).

- [x] Config visual por empresa em `config_empresa/configuracoes.php` (GET/PUT: logo, cores, contatos).
- [x] `os/os_pdf.php` — versão **imprimível HTML** (empresa, OS, materiais c/ total, assinaturas). *(Sem lib de PDF por ora; imprime no navegador.)*
- [ ] (Após D8/D10) Forma de pagamento/valor de serviço no PDF + assinatura digital (canvas).

## 7. Premium — Ativos, Checklist, Estoque, Dashboard

- [x] (P) **Ativos + QR Code:** `ativos/ativos.php` (CRUD, gera `qr_code`) + `ativos/por_qr.php` (scan → ativo + histórico de OS). *(QR como imagem: frontend; conteúdo final D9.)*
- [x] (P) **Checklist:** `checklist/modelos.php`, `checklist/itens.php`, `checklist/por_categoria.php` (carrega pela categoria), `checklist/respostas.php`.
- [x] (P) **Estoque:** `estoque/materiais.php` + `estoque/movimentacoes.php` (entrada/saída atualiza `quantidade_atual`; valida estoque).
- [x] (P) **Dashboard:** `dashboard/indicadores.php` (totais, tempo médio, por técnico, por unidade).
- [x] **Gating Premium no backend:** `exigirPremium()` em todos os endpoints Premium (checa `empresas.plano`).
- [x] Testado em produção (26/26).

## 8. Painel admin_geral + usuários

- [x] `empresas/empresa_criar.php` (cria empresa + banco) e `empresas/empresas.php` (listar/atualizar plano/status, contagem de usuários).
- [x] `usuarios/usuarios.php` — gestão de usuários da empresa (admin_empresa/supervisor/tecnico/solicitante).
- [x] `cadastros/tecnicos.php` — técnicos (usuário central + vínculo com unidades).
- [x] Testado em produção (26/26). Pendências: reset de senha; tabela `planos` (D5) se necessário.

---

## 9. Frontend (React + TypeScript / CRA — azul/branco) — em `lizzi_facilities/frontend/`

> SPA TypeScript (Create React App, `npm start`, HashRouter, `homepage:'.'`) servível de qualquer subpasta no LiteSpeed. Cliente de API com token em `src/lib/api.ts`; `API_BASE` em `src/config.ts`. **Build validado (`npm run build` OK, "Compiled successfully").**

- [x] Setup CRA + React + **TypeScript** + Router + tema azul/branco (`styles.css`) + layout (sidebar/topbar).
- [x] **Polimento UI v2 (profissional/elegante/animado):** fonte **Inter**, **fundo gradiente animado + orbs flutuantes**, **scroll-reveal** (`useReveal`), **contadores animados** (`Contador`), texto com degradê, micro-interações (hover lift/glow, brilho nos botões), sidebar responsiva com hambúrguer. **Validado por screenshot (desktop + mobile + página inteira).** Build OK.
- [x] **Polimento v3 (tema manutenção, sem "cara de I.A"):** emojis trocados por **ícones SVG** (`Icones.tsx` — chave, QR, checklist, caixa, gráfico, engrenagem...), seção **"Como funciona na prática"** (passos numerados), e **rótulos pt-br humanizados** (`rotulos.ts`: "Em andamento", "Aguardando aprovação", "Concluído"...) nas telas de OS.
- [x] **Aba "Soluções"** (`/solucoes`): problema→solução (Antes ✕ / Com a Lizzi ✓), como usar no dia a dia, **para quem é** (condomínios, indústria, varejo, saúde, escolas, facilities) e benefícios. Link no menu e no rodapé.
- [x] **Polimento v4 (auth + pós-login):** `AuthLayout` (tela dividida com painel da marca) no **login** e **cadastro** (+ seletor de plano); **dashboard** com saudação, card CTA, **stat-cards com ícone/cor + contador** e tabelas por técnico/unidade; menu lateral com ícones SVG. **Validado por screenshot (login, cadastro e dashboard com dados mockados).**
- [x] **Polimento v5 (login/cadastro):** **ícones nos campos** (email, cadeado, usuário, prédio, WhatsApp) e efeito **"antigravity"** — chips de vidro com ícones de manutenção levitando no painel. Cadastro enxuto (coluna única, plano em toggle). Validado por screenshot.
- [x] **Erros amigáveis pt-br:** `api.ts` trata erro de rede ("Não foi possível conectar...") e dá texto amigável por status (403/404/409/422/500/502); mensagens do backend (pt-br) têm prioridade. Backend deixou de vazar exceção crua no cadastro (loga no servidor).
- [x] **Bug "Failed to fetch" no cadastro RESOLVIDO:** causa = `config.ts` apontava p/ `/app_lizzi_fa` mas o backend está aninhado em `/app_lizzi_fa/app_lizzi_fa` → preflight OPTIONS dava 404 sem CORS. Apontei o `config.ts` p/ o caminho aninhado (testado: signup cria empresa+banco+token OK). **Ao achatar a pasta, trocar `API_BASE` de volta p/ `/app_lizzi_fa`.**
- [x] Auth: login + guarda de rotas (`Protegido`) + token em localStorage + logout.
- [x] **Landing page** (hero, funcionalidades, planos Simples/Premium) — rota pública `/`.
- [x] **Auto-cadastro público** (`/cadastro`): tela "Criar conta" + endpoint `empresas/cadastro_publico.php` (cria empresa+banco+admin e auto-login). ⚠️ Antes de produção: captcha/confirmação de e-mail (anti-abuso). Decisão de onboarding: **self-service**.
- [x] Dashboard (indicadores Premium; aviso no Simples).
- [x] Cadastro **Unidades** (CRUD completo — template dos demais).
- [x] OS: lista (filtro status), nova (selects em cascata unidade→piso→local), detalhe (status, WhatsApp, PDF, histórico).
- [ ] Demais cadastros (pisos/locais/categorias/técnicos) — replicar template de Unidades.
- [ ] (P) Telas Premium: ativos+QR, checklist, estoque.
- [ ] Config da empresa (visual + WhatsApp) + painel admin_geral (empresas/usuários).
- [ ] Recuperação de senha (depende do endpoint no backend).

---

## 10. 🟦 Landing page (site do produto) — **repaginada e responsiva**

> Página de marketing/venda do **Lizzi Facilities** (azul/branco), foco em conversão. Rota pública `/` no mesmo app React (LP-1 ✅).

- [x] **LP-1 (decisão):** rota pública `/` no app React.
- [x] **Hero** com gradiente, selo, CTAs ("Criar conta grátis" / "Acessar") + linha de confiança.
- [x] **Mockup de celular interativo** mostrando a cara do sistema (mini OS + status + stats, com animação flutuante).
- [x] **Funcionalidades** (6 cards com ícone + hover).
- [x] **Comparativo de planos** Simples vs Premium (CTAs levam ao `/cadastro?plano=`).
- [x] **Prova social:** seção de **depoimentos** (3 clientes, estrelas, avatar).
- [x] **CTA final** + **captação via auto-cadastro** (`/cadastro`) e WhatsApp.
- [x] **Botão flutuante de WhatsApp** (`WhatsappFlutuante`) na landing e páginas legais.
- [x] **Footer** com **CNPJ 58.030.824/0001-94** + links Privacidade/Termos/WhatsApp.
- [x] **Política de Privacidade** (`/privacidade`, LGPD) e **Termos de Uso** (`/termos`) com o CNPJ.
- [x] **Responsivo** (hero/sidebar/seções adaptam ao mobile). Meta description no `index.html`.
- [ ] SEO extra (OpenGraph/imagem de preview/favicon) e **Analytics** (pixel/GA) — confirmar ferramenta.
- [ ] (Recomendado) Captcha + confirmação de e-mail no `/cadastro` antes de produção (anti-abuso).

---

## 11. Multi-tenant — checklist de enforcement (aplicar em CADA arquivo PHP)

> Seção 8 do DOC. Critério de aceite recorrente, não uma etapa única.

- [ ] Autenticar (`core/auth.php`) antes de qualquer ação.
- [ ] Ler `db_nome` do token (nunca do body/cliente) e conectar no banco da empresa.
- [ ] Rodar as queries no banco da empresa (sem `tenant_id`).
- [ ] `admin_geral` (`empresa_id` NULL) é a **única** exceção que acessa outros bancos.
- [ ] Nunca conectar num banco diferente do da empresa logada.
- [ ] Validar que o recurso (por ID) existe no banco da empresa antes de expor/alterar.

## 12. Definition of Done (Seção 10 do DOC)

- [ ] Nada fora do escopo da Seção 5.
- [ ] Banco central (`empresas`/`usuarios`) + 1 banco por empresa; tabelas operacionais com `created_at`/`updated_at`/`deleted_at`.
- [ ] Isolamento entre empresas testado (empresa A não acessa o banco de B).
- [ ] Soft delete em todas as exclusões; nada apagado fisicamente.
- [ ] OS gera histórico em toda mudança de status; tempos calculados automaticamente.
- [ ] Imagens em `os_imagens`; materiais geram `saida` em `materiais_movimentacoes`.
- [ ] `codigo` da OS sequencial por empresa.
- [ ] Simples não obriga ativo; Premium permite OS por ativo ou local.
- [ ] Checklist Premium carregado pela categoria do ativo.
- [ ] Auth validada em todos os endpoints; senhas com `password_hash`.
- [ ] Frontend React simples (azul/branco), responsivo, < 10 min de aprendizado.
- [ ] Backend **PHP puro**: 1 arquivo por funcionalidade, config único (`config.php`).
- [ ] Banco **PostgreSQL** (`lizzi_facilities`) via PDO; sem dependência de MySQL.
- [ ] Landing page no ar, responsiva, com CTA funcional e captação de lead.

---

## 13. Dúvidas em aberto (Seção 12 do DOC)

> 🟥 = bloqueante · 🟨 = definir cedo · ✅ = resolvido.

- [x] ✅ D1 Auth (token em tabela) · [ ] D2 🟥 Clientes · [ ] D3 🟨 Anexos · [ ] D4 🟨 WhatsApp (Evolution: host/onboarding/retry)
- [ ] D5 🟨 Planos (strings/preços) · [x] ✅ D6 `admin_geral` (central, `empresa_id` NULL) · [ ] D7 🟨 Permissões finas · [ ] D8 🟥 Valores/PDF
- [ ] D9 🟨 QR Code (conteúdo) · [ ] D10 🟨 Assinaturas PDF · [ ] D11 🟨 Storage (local/S3) · [ ] D12 🟨 Acesso à identidade visual
- [x] ✅ D13 multi-tenant (1 banco por cliente) · [x] ✅ LP-1 Landing no mesmo app React (rota pública `/`)
