# app_lizzi_fa — Backend PHP (Lizzi Facilities)

Backend **PHP puro + PostgreSQL (PDO)**, modelo **1 banco por cliente**.
Servido em `https://alexios.com.br/app_lizzi_fa/`. Regras: ver [../Lizzi-Facilities-DOC-DESENVOLVIMENTO.md](../Lizzi-Facilities-DOC-DESENVOLVIMENTO.md). Banco: [../database.md](../database.md).

## Estrutura
```
app_lizzi_fa/
  config.php            # config real (NÃO versionar — está no .gitignore)
  config.example.php    # modelo
  .htaccess             # repassa o header Authorization + bloqueia config.php
  core/
    db.php              # config() + dbCentral() (PDO no central)
    tenant.php          # conectarTenant() + criarBancoEmpresa() (cria banco no cadastro)
    auth.php            # autenticar() por token em tabela + exigirPerfil/Empresa/Premium
    response.php        # jsonResponse/jsonError/bodyJson/cors
    log.php             # registrarLog() (Regra 11; grava no banco da empresa)
  login.php             # POST { email, senha } -> token
  logout.php            # POST (Bearer) -> invalida token
  empresas/
    empresa_criar.php   # POST (admin_geral) cria empresa + banco lizzi_emp_<id>
```

## Setup
1. `cp config.example.php config.php` e preencher a senha real.
2. Banco central já criado? (rodar `../central.sql` + `../migration_usuarios_token.sql`).
3. Garantir extensão `pdo_pgsql` habilitada no PHP.

## Autenticação (token em tabela)
- Login devolve um `token`; envie nas próximas chamadas em `Authorization: Bearer <token>`.
- O token é validado no banco central a cada request (`usuarios.token` + `token_expira_em`).
- O token carrega indiretamente a empresa: o backend resolve `db_nome` e conecta no banco da empresa.

## Testes rápidos (curl)
```bash
BASE=https://alexios.com.br/app_lizzi_fa

# 1) login do admin_geral (seed) — senha lizzi123
curl -s -X POST $BASE/login.php \
  -H 'Content-Type: application/json' \
  -d '{"email":"admingeral@lizzi.com","senha":"lizzi123"}'

# guarde o token retornado:
TOKEN=cole_o_token_aqui

# 2) cadastrar uma empresa (cria o banco lizzi_emp_<id> automaticamente)
curl -s -X POST $BASE/empresas/empresa_criar.php \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"nome":"Empresa Teste","plano":"premium","admin_nome":"Fulano","admin_email":"admin@teste.com","admin_senha":"senha123"}'

# 3) login do admin_empresa recém-criado (já roteia para o banco da empresa)
curl -s -X POST $BASE/login.php \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@teste.com","senha":"senha123"}'

# 4) logout
curl -s -X POST $BASE/logout.php -H "Authorization: Bearer $TOKEN"
```

## Endpoints disponíveis
Todos (exceto login) exigem `Authorization: Bearer <token>`. Cadastros simples = REST por método (GET/POST/PUT/DELETE).

**Auth / central**
- `POST login.php` · `POST logout.php`
- `empresas/empresa_criar.php` (admin_geral; cria empresa + banco)
- `GET|PUT empresas/empresas.php` (admin_geral; lista/atualiza empresas)
- `usuarios/usuarios.php` (admin_empresa/admin_geral; gestão de usuários)

**Cadastros base** (banco da empresa)
- `cadastros/unidades.php` · `pisos.php` · `locais.php` · `categorias.php` · `tecnicos.php`

**Ordem de Serviço** (`os/`)
- `POST os_criar.php` · `GET os_listar.php` · `GET os_detalhe.php?id=`
- `POST os_atualizar_status.php` · `os_imagens.php` (GET/POST upload) · `POST os_enviar_whatsapp.php` · `GET os_pdf.php?id=` (HTML imprimível)

**Premium** (exigem plano premium)
- `ativos/ativos.php` · `GET ativos/por_qr.php?codigo=`
- `checklist/modelos.php` · `itens.php` · `GET por_categoria.php?categoria_id=` · `respostas.php`
- `estoque/materiais.php` · `estoque/movimentacoes.php`
- `GET dashboard/indicadores.php`

**Config**
- `GET|PUT config_empresa/configuracoes.php` (visual + WhatsApp por empresa)

## Pendências (dúvidas em aberto)
Reset de senha; Clientes (D2); Anexos (D3); valores/assinatura no PDF (D8/D10); URL do N8N no config (D4); conteúdo do QR (D9).
