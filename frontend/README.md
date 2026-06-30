# frontend — Lizzi Facilities (React + TypeScript / CRA)

SPA em **React + TypeScript** (Create React App, azul/branco) que consome a API PHP.
Inclui a **landing page** (rota pública `/`) e o **sistema logado** (`/app/...`).

## Rodar local
```bash
npm install
npm start        # abre em http://localhost:3000
```
Por padrão a API aponta para `https://alexios.com.br/app_lizzi_fa` (ver `src/config.ts`).
Para apontar a outra URL em dev, crie `.env.local`:
```
REACT_APP_API_BASE=https://seu-host/app_lizzi_fa
```

## Build / deploy
```bash
npm run build    # gera a pasta build/
```
Suba o conteúdo de **`build/`** para uma pasta no servidor (ex.: `public_html/` ou `public_html/lizzi/`).
- `homepage: "."` no package.json → assets com caminho relativo (funciona em qualquer subpasta).
- **HashRouter** → sem necessidade de regra de rewrite no LiteSpeed (URLs com `#/`).
- Ajuste `src/config.ts` (ou `REACT_APP_API_BASE`) para a URL final da API **antes** do build.

## Estrutura
```
src/
  config.ts              # API_BASE, contato WhatsApp
  index.tsx              # bootstrap (HashRouter + AuthProvider)
  App.tsx                # rotas (públicas + protegidas)
  styles.css             # tema azul/branco
  lib/api.ts             # fetch com token (Bearer) + tratamento 401 + tipos
  lib/auth.tsx           # AuthProvider, useAuth, <Protegido>
  components/Layout.tsx  # sidebar + topbar (área logada)
  pages/
    Landing.tsx          # site público (/)
    Login.tsx            # /login
    Dashboard.tsx        # /app
    Unidades.tsx         # /app/unidades  (CRUD — template dos cadastros)
    OSLista/OSNova/OSDetalhe.tsx  # /app/os...
```

## Scripts
| Comando | O que faz |
|---|---|
| `npm start` | servidor de desenvolvimento (localhost:3000) |
| `npm run build` | gera `build/` para produção |
| `npm test` | testes (CRA) |

## Próximas telas (mesmo padrão)
Cadastros pisos/locais/categorias/técnicos (clonar `Unidades.tsx`), telas Premium (ativos+QR, checklist, estoque),
config da empresa e painel admin_geral (empresas/usuários).
