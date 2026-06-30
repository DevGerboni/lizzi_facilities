# LIZZI FACILITIES — Banco de Dados (PostgreSQL)

Data: 2026-06-28
Banco: **PostgreSQL** · Stack: **Backend PHP** (`https://alexios.com.br/app_lizzi_fa/`) · **Frontend React**.
Modelo regras/dados: [Lizzi-Facilities-DOC-DESENVOLVIMENTO.md](lizzi_facilities/Lizzi-Facilities-DOC-DESENVOLVIMENTO.md).

> **Estratégia multi-tenant (D13 — DEFINIDO): UM BANCO POR CLIENTE.**
> Há um **banco central** com as tabelas de cima (empresas + login) e, **quando uma empresa se cadastra,
> o sistema cria um banco novo** só pra ela com as tabelas operacionais. Mesmo conceito do `projetos_agentes_ia_back`.

---

## 1. Arquitetura dos bancos

```
PostgreSQL @ 46.202.147.162:5432
│
├── lizzi_facilities          ← BANCO CENTRAL (fixo)
│     ├── empresas            (cada cliente/tenant + o nome do banco dele)
│     └── usuarios            (LOGIN de todos; admin_geral tem empresa_id NULL)
│
├── lizzi_emp_1               ← banco da Empresa 1 (criado no cadastro)
│     ├── configuracoes_empresa
│     ├── unidades / pisos / locais / categorias / ativos / tecnicos_unidades
│     ├── ordens_servico / os_imagens / os_historico
│     ├── checklist_modelos / checklist_itens / os_checklist_respostas
│     ├── materiais / materiais_movimentacoes
│     └── logs
│
├── lizzi_emp_2               ← banco da Empresa 2 (mesma estrutura)
└── ...                       ← um banco por empresa
```

**Arquivos SQL deste diretório:**
- **[central.sql](lizzi_facilities/central.sql)** — cria o banco central (`empresas`, `usuarios`) + seed do `admin_geral`.
- **[tenant_template.sql](lizzi_facilities/tenant_template.sql)** — template rodado em CADA banco de empresa (tabelas operacionais, **sem `tenant_id`**).

> Por que **sem `tenant_id`** nas tabelas operacionais? O próprio banco já isola a empresa. O isolamento deixa de ser
> "filtrar por `tenant_id`" e passa a ser "conectar no banco certo".

---

## 2. Conexão / credenciais

| Item | Valor |
|---|---|
| Host | `46.202.147.162` |
| Porta | `5432` |
| Banco central | `lizzi_facilities` |
| Banco por empresa | `lizzi_emp_<id da empresa>` |
| Usuário | `postgres` |
| Senha | `38653084` |

> ⚠️ **Segurança:** manter as credenciais em `config.php` **fora do controle de versão** (versionar só `config.example.php`).
> O usuário `postgres` precisa de permissão para **CREATE DATABASE** (necessária no cadastro de empresas).

**`config.php` (exemplo):**
```php
<?php
return [
    'db' => [
        'host' => '46.202.147.162',
        'port' => '5432',
        'user' => 'postgres',
        'pass' => '38653084',
        'central' => 'lizzi_facilities',     // banco central
        'tenant_prefix' => 'lizzi_emp_',      // <prefixo><id> = banco da empresa
    ],
    'app_base_url' => 'https://alexios.com.br/app_lizzi_fa/',
    'n8n_whatsapp_webhook_url' => '',         // ver 7.4 do DOC
    'n8n_webhook_secret' => '',
    'evolution_api_url' => '',
    'evolution_api_key' => '',
];
```

---

## 3. Subir em produção (passo a passo)

```bash
# 1) Criar o banco central (conectado ao banco 'postgres', fora de transação)
psql "postgresql://postgres:38653084@46.202.147.162:5432/postgres" \
  -c "CREATE DATABASE lizzi_facilities WITH ENCODING 'UTF8' TEMPLATE template0;"

# 2) Rodar o schema central (cria empresas, usuarios e o admin_geral)
psql "postgresql://postgres:38653084@46.202.147.162:5432/lizzi_facilities" \
  -f central.sql
```

A partir daí, **cada empresa nova é criada pelo backend** (ver Seção 4). Para criar um banco de empresa **na mão** (teste):

```bash
psql "postgresql://postgres:38653084@46.202.147.162:5432/postgres" \
  -c "CREATE DATABASE lizzi_emp_1 WITH ENCODING 'UTF8' TEMPLATE template0;"
psql "postgresql://postgres:38653084@46.202.147.162:5432/lizzi_emp_1" \
  -f tenant_template.sql
```

---

## 4. Fluxo de cadastro de uma empresa (no PHP)

> Resolve a Regra 4 ("verificar/criar banco"): a criação do banco do cliente acontece no registro.

1. `INSERT` em `empresas` (central) → obtém `id`.
2. Monta `db = 'lizzi_emp_' . $id`.
3. Conecta como `postgres` no banco `postgres` e roda `CREATE DATABASE <db> ...` (**fora de transação**).
4. Conecta em `<db>` e executa o `tenant_template.sql`.
5. `UPDATE empresas SET db_nome = '<db>' WHERE id = $id`.
6. (Opcional) `INSERT` da 1ª linha de `configuracoes_empresa` no banco da empresa.
7. (Opcional) cria o usuário `admin_empresa` em `usuarios` (central) com `empresa_id = $id`.

```php
// criar o banco do cliente (precisa conectar no banco 'postgres')
$pdoRoot = new PDO("pgsql:host=46.202.147.162;port=5432;dbname=postgres", 'postgres', '38653084');
$pdoRoot->exec("CREATE DATABASE {$db} WITH ENCODING 'UTF8' TEMPLATE template0"); // CREATE DATABASE não roda em transação

// rodar o template dentro do banco novo
$pdoTenant = new PDO("pgsql:host=46.202.147.162;port=5432;dbname={$db}", 'postgres', '38653084');
$pdoTenant->exec(file_get_contents(__DIR__ . '/tenant_template.sql'));
```

---

## 5. Fluxo de login (roteamento para o banco da empresa)

1. Usuário envia **email + senha** → autenticar contra `usuarios` (banco **central**), `password_verify`.
2. Lê `empresa_id` do usuário → busca `empresas.db_nome`.
3. Emite o token carregando **`{ id, empresa_id, db_nome, perfil }`**.
4. Nas demais requisições, o backend usa `db_nome` (do token) para **conectar no banco da empresa**.
5. `admin_geral` (`empresa_id` NULL): acessa o central e pode conectar em qualquer `db_nome`.

```php
// helper: conexão dinâmica no banco da empresa logada
function conectarTenant(string $dbNome): PDO {
    return new PDO("pgsql:host=46.202.147.162;port=5432;dbname={$dbNome}", 'postgres', '38653084', [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
}
// dentro de uma OS: sem tenant_id, pois o banco já é o da empresa
$pdo = conectarTenant($dbNomeDoToken);
$os = $pdo->query("SELECT * FROM ordens_servico WHERE deleted_at IS NULL ORDER BY created_at DESC")->fetchAll();
```

---

## 6. Convenções do schema

- **PK:** `id BIGSERIAL PRIMARY KEY`.
- **Sem `tenant_id`** nas tabelas operacionais (o banco isola a empresa).
- **Timestamps:** `created_at`, `updated_at` (`TIMESTAMPTZ DEFAULT now()`), `deleted_at TIMESTAMPTZ NULL` (**soft delete**).
- `updated_at` atualizado por trigger `set_updated_at()` (criada em cada banco).
- **Enums** via `VARCHAR + CHECK`.
- Valores monetários `NUMERIC(12,2)`; quantidades `NUMERIC(12,3)`.
- Imagens/anexos: guardar **só o caminho/URL**.
- **`codigo` da OS:** sequencial via `SEQUENCE os_codigo_seq` do próprio banco (cada empresa começa em `OS-000001`).
- **Referências a usuários** (`solicitante_id`, `tecnico_id`, `usuario_id`, `tecnicos_unidades.tecnico_id`): são `BIGINT` apontando para `usuarios.id` do **banco central**, **sem FK** (não há FK/JOIN entre bancos no PostgreSQL — o nome do usuário é resolvido no PHP).

---

## 7. Tabelas — resumo de campos

### Banco central (`lizzi_facilities`) — ver [central.sql](lizzi_facilities/central.sql)
- **empresas**: `id` · `nome` · `documento` · `email` · `telefone` · `whatsapp` · `logo_url` · `plano`(simples/premium) · `status` · **`db_nome`** · timestamps · `deleted_at`
- **usuarios**: `id` · `empresa_id`(NULL=admin_geral) · `nome` · `email`(único) · `telefone` · `whatsapp` · `senha_hash` · `perfil` · `status` · timestamps · `deleted_at`

### Banco de cada empresa (`lizzi_emp_<id>`) — ver [tenant_template.sql](lizzi_facilities/tenant_template.sql)
- **configuracoes_empresa** (1 linha): dados visuais + `whatsapp_numero` · `whatsapp_instancia` · `whatsapp_ativo`
- **unidades** → **pisos** → **locais** (hierarquia)
- **categorias** (`tipo`: ativo/chamado/ambos)
- **ativos** (Premium): unidade+piso+local obrigatórios · `categoria_id` · `marca` · `qr_code` · `foto_url` · ...
- **tecnicos_unidades**: `tecnico_id`(central) ↔ `unidade_id`
- **ordens_servico**: `codigo` · unidade/piso/local · `ativo_id`(NULL no Simples) · `solicitante_id`/`tecnico_id`(central) · `tipo_os` · `prioridade` · `status` · tempos · `assinatura_tecnico_url` · `assinatura_cliente_url`
- **os_imagens** (`tipo`: abertura/execucao/conclusao) · **os_historico** (mudanças de status)
- **checklist_modelos** → **checklist_itens** → **os_checklist_respostas** (Premium)
- **materiais** · **materiais_movimentacoes** (entrada/saida; baixa de OS → saida) (Premium)
- **logs** (Regra 11)

---

## 8. Custos/atenções deste modelo (1 banco por cliente)

- **Migrações:** toda alteração de schema operacional precisa rodar em **todos** os bancos `lizzi_emp_*` (manter o `tenant_template.sql` versionado + um script que aplica em todos).
- **Dashboard do `admin_geral` cross-empresa:** exige **iterar** os bancos das empresas (não há JOIN entre bancos).
- **Sem FK entre bancos:** nomes de usuário (técnico/solicitante) são resolvidos no PHP a partir do `id` + banco central.
- **Permissão:** o usuário `postgres` precisa poder `CREATE DATABASE`.

---

## 9. Pendências do modelo (dúvidas em aberto — Seção 12 do DOC)

- **D2 — Clientes:** "Clientes" é um `usuarios` com perfil `solicitante` (no central) ou uma entidade própria **dentro do banco da empresa** (tabela `clientes`)? Afeta `ordens_servico.solicitante_id` e o PDF.
- **D3 — Anexos:** criar `os_anexos` (no banco da empresa) se houver anexos além de imagens.
- **D8 — Valores/PDF:** se houver precificação de serviço/mão de obra, definir campos em `ordens_servico`.
- **D5 — Planos:** se `admin_geral` "cria planos", avaliar tabela `planos` no central (hoje `empresas.plano` é só o enum).

---

## 10. Próximas partes

1. ✅ **Banco** (central + template por cliente).
2. ⏭️ **Backend PHP** — `config.php` + `core/` (db central, conexão dinâmica por tenant, criação de banco no cadastro, auth, log) + endpoints.
3. ⏭️ **Frontend React** + landing page.
