# ANALISE DO PROJETO `lizzi_facilities/frontend`

## 1. Escopo desta analise

Este documento mapeia o frontend web do projeto `lizzi_facilities`, com foco em:

- arquitetura da aplicacao;
- logica funcional;
- regras de negocio refletidas no frontend;
- controle de acesso por perfil e por plano;
- integracoes com APIs PHP;
- observacoes tecnicas importantes para manutencao e refatoracao.

Base analisada:

- `lizzi_facilities/frontend`
- cruzamento estrutural com `lizzi_facilities/app_lizzi_fa`

## 2. Visao geral da arquitetura

O frontend e uma aplicacao React + TypeScript criada com `react-scripts` e roteamento por `HashRouter`.

Arquivos centrais:

- `frontend/src/index.tsx`: bootstrap da aplicacao com `HashRouter` e `AuthProvider`.
- `frontend/src/App.tsx`: mapa de rotas publicas e protegidas.
- `frontend/src/lib/auth.tsx`: contexto de autenticacao, login, logout e cadastro publico.
- `frontend/src/lib/api.ts`: cliente HTTP padrao, sessao, tratamento de erros, imagens e compressao.
- `frontend/src/config.ts`: configuracao do `API_BASE` e contato comercial.
- `frontend/src/components/Layout.tsx`: shell autenticado com menu lateral e topbar.

Arquiteturalmente, o sistema esta dividido em 2 blocos:

- area publica/comercial: landing, solucoes, termos, privacidade, login, cadastro e pagina do app mobile;
- area autenticada operacional: dashboard, ordens de servico, agenda, cadastros, usuarios, empresas, configuracao, ativos, checklist, estoque e relatorios.

## 3. Stack e decisoes tecnicas do frontend

- React 18
- TypeScript
- `react-router-dom` v6
- `HashRouter` em vez de `BrowserRouter`
- `qrcode.react` para QR Code
- CSS centralizado em `frontend/src/styles.css`

Decisoes tecnicas importantes:

- a autenticacao depende de `localStorage` com `lizzi_token` e `lizzi_user`;
- o backend esperado e PHP com respostas JSON;
- o frontend espera, na maior parte dos casos, o contrato `{ success, data, message }`, mas aceita JSON simples quando `data` nao existe;
- uploads de imagem sao comprimidos no navegador antes do envio para reduzir risco de limite de upload do PHP;
- a aplicacao depende fortemente de rotas `.php` organizadas por modulo.

## 4. Estrutura funcional do frontend

### 4.1 Rotas publicas

Rotas publicas mapeadas em `frontend/src/App.tsx`:

- `/`
- `/fluxo`
- `/porque`
- `/modulos`
- `/integracoes`
- `/planos`
- `/login`
- `/cadastro`
- `/privacidade`
- `/termos`
- `/solucoes`
- `/mobile`

Essas rotas sustentam a parte de marketing, aquisicao e entrada de usuarios.

### 4.2 Rotas autenticadas

Rotas sob `/app`:

- `/app`
- `/app/empresas`
- `/app/cadastros`
- `/app/unidades`
- `/app/usuarios`
- `/app/config`
- `/app/ativos`
- `/app/checklist`
- `/app/estoque`
- `/app/os`
- `/app/os/nova`
- `/app/os/:id`
- `/app/agenda`
- `/app/relatorios`
- `/app/qr/:codigo`

Todas passam por `Protegido`, que valida apenas a existencia do token local.

## 5. Controle de acesso e regras de permissao

O frontend aplica regras por perfil e por plano antes mesmo de chamar a API.

Perfis percebidos no sistema:

- `admin_geral`
- `admin_empresa`
- `supervisor`
- `tecnico`
- `solicitante`

Regras de perfil em `App.tsx`:

- `admin_geral` e redirecionado para `/app/empresas`.
- `admin_empresa` e `supervisor` podem acessar cadastros, unidades, configuracao, relatorios e gestao da empresa.
- `admin_empresa`, `supervisor` e `admin_geral` podem acessar usuarios.
- rotas premium ainda podem ser bloqueadas por plano.

Regras de menu em `Layout.tsx`:

- `admin_geral` enxerga apenas empresas e usuarios/permissoes.
- usuarios comuns autenticados enxergam dashboard, OS e agenda.
- recursos administrativos internos aparecem so para `admin_empresa` e `supervisor`.
- `ativos`, `checklist` e `estoque` so aparecem se `isPremium === true`.

## 6. Regra de planos

O frontend trabalha com 2 planos:

- `simples`
- `premium`

Regra central:

- `isPremium` vem de `user?.plano === 'premium'`.

Consequencias no frontend:

- o menu oculta recursos premium;
- as rotas premium sao protegidas por `PremiumOnly` ou `PremiumEmpresaAdminOnly`;
- se uma chamada premium vazar, o cliente trata `HTTP 402` com `RecursoPremiumError`, sem renderizar mensagem de erro ao usuario.

Modulos claramente premium:

- equipamentos/ativos;
- checklist;
- estoque;
- leitura/consulta por QR Code.

## 7. Fluxos principais de negocio

### 7.1 Login e sessao

Fluxo:

- login em `/login`;
- chamada `POST /login.php`;
- armazenamento local de token e usuario;
- redirecionamento para empresas ou dashboard conforme perfil.

Logout:

- chamada `POST /logout.php`;
- limpeza local mesmo se a API falhar.

### 7.2 Cadastro publico de empresa

Fluxo:

- cadastro publico em `/cadastro`;
- envio para `POST /empresas/cadastro_publico.php`;
- a conta nao loga automaticamente;
- o frontend deixa claro que a empresa entra em analise.

Regra relevante:

- existe honeypot `website` para filtragem simples de spam/bot.

### 7.3 Gestao de empresas

Tela: `Empresas.tsx`

Responsabilidade:

- usada pelo `admin_geral`;
- lista empresas;
- aprova empresa pendente;
- altera plano;
- ativa/desativa ambiente.

Regra importante:

- empresa sem `db_nome` e tratada como pendente, sugerindo provisionamento multiempresa por base separada.

### 7.4 Dashboard operacional

Tela: `Dashboard.tsx`

Exibe:

- totais de OS;
- distribuicao por status;
- distribuicao por prioridade;
- distribuicao por tipo;
- produtividade por tecnico;
- volume por unidade;
- tempos medios e horas trabalhadas.

Dependencia:

- `GET /dashboard/indicadores.php`

### 7.5 Cadastros mestres

Tela: `Cadastros.tsx`

Modulos internos:

- unidades;
- pisos;
- locais;
- tipos de chamado;
- tecnicos.

Regras observadas:

- piso depende de unidade;
- local depende de unidade e piso;
- tecnicos podem ser vinculados a multiplas unidades;
- tipos de chamado sao cadastrados em `categorias`.

### 7.6 Usuarios e permissoes

Tela: `Usuarios.tsx`

Responsabilidade:

- CRUD de usuarios internos;
- atribuicao de perfil;
- ativacao/inativacao;
- no caso de `admin_geral`, selecao explicita da empresa alvo.

Regras:

- `admin_geral` precisa escolher a empresa antes de salvar ou listar;
- o email nao pode ser editado no modo de edicao;
- senha no modo edicao e opcional;
- o perfil funcional e tratado no frontend como texto fechado entre os valores conhecidos.

### 7.7 Configuracao da empresa

Tela: `ConfigEmpresa.tsx`

Campos cobertos:

- dados institucionais;
- identidade visual;
- logo;
- cores da marca;
- parametros de WhatsApp / Evolution / N8N.

Regras:

- logo e enviada separadamente;
- upload da logo usa compressao;
- existe um booleano `whatsapp_ativo`;
- a tela sugere integracao com Evolution API e N8N.

### 7.8 Ordens de servico

Telas:

- `OSLista.tsx`
- `OSNova.tsx`
- `OSDetalhe.tsx`
- `Agenda.tsx`

Fluxo de criacao:

- o usuario pode abrir OS por local ou, no premium, por equipamento;
- unidade -> piso -> local formam uma cadeia dependente;
- tecnico pode ser filtrado por unidade atendida;
- imagens de abertura podem ser anexadas no ato da criacao;
- se a OS for criada a partir de um ativo, o backend pode herdar localizacao do equipamento.

Status operacionais identificados:

- `aberto`
- `em_andamento`
- `interrompido`
- `aguardando_aprovacao`
- `concluido`
- `cancelado`

Maquina de estados implementada no frontend em `OSDetalhe.tsx`:

- `aberto` -> `em_andamento`
- `em_andamento` -> `interrompido`
- `em_andamento` -> `aguardando_aprovacao`
- `em_andamento` -> `concluido`
- qualquer estado aberto pode ir para `cancelado`
- `interrompido` -> `em_andamento`
- `aguardando_aprovacao` -> `aberto` com fluxo de reagendamento
- `concluido` e `cancelado` travam a OS

Regras fortes de OS:

- OS encerrada vira somente leitura;
- OS concluida ou cancelada bloqueia alteracao de status;
- OS encerrada bloqueia novas imagens, checklist, materiais e assinaturas;
- conclusao e cancelamento exigem confirmacao explicita em modal;
- reagendamento e troca de tecnico sao liberados a perfis administrativos;
- envio de WhatsApp pode ser disparado para tecnico e cliente;
- PDF da OS exige fetch autenticado com token, nao apenas link direto.

### 7.9 Checklist

Telas:

- `Checklist.tsx`
- bloco de checklist dentro de `OSDetalhe.tsx`

Modelo funcional:

- primeiro se cria um modelo;
- o modelo e vinculado a um tipo de chamado;
- depois se criam itens com regras de preenchimento.

Regras por item:

- obrigatorio;
- exige foto;
- exige observacao;
- ordem de exibicao.

Regras na execucao da OS:

- checklist da OS e resolvido por `os_id`;
- o frontend valida obrigatoriedade antes de salvar;
- fotos de itens podem ser enviadas individualmente antes da consolidacao das respostas;
- checklist so e exibido em plano premium.

### 7.10 Equipamentos e QR Code

Telas:

- `Ativos.tsx`
- `QRAtivo.tsx`

Fluxo:

- cadastro de equipamento com localizacao, identificacao e categoria;
- upload de foto;
- geracao/uso de QR Code;
- impressao de etiqueta;
- consulta por QR com historico de OS;
- possibilidade de abrir nova OS a partir de um equipamento.

Regras:

- o modulo inteiro so existe no premium;
- o equipamento pode carregar uma categoria que influencia checklist e tipo de manutencao;
- a URL do QR aponta para a rota autenticada `/app/qr/:codigo`.

### 7.11 Estoque e materiais

Tela: `Estoque.tsx`

Fluxos:

- cadastro de material;
- movimentacao manual de entrada/saida;
- baixa de material diretamente dentro da OS.

Regras:

- modulo premium;
- movimentacao manual nao substitui o consumo vinculado a OS;
- quantidade e tratada como inteiro no frontend atual;
- valores monetarios usam formatacao local pt-BR;
- ao adicionar material numa OS, o frontend pode criar material novo sob demanda.

### 7.12 Relatorios

Tela: `Relatorios.tsx`

Comportamento:

- area de extracao, nao de dashboard visual detalhado;
- filtros por periodo, status, unidade e tecnico;
- exportacao em CSV;
- exportacao em PDF.

Regras:

- relatorio `chamados` usa PDF completo do servidor com imagens, assinaturas, checklist e historico;
- outros relatorios podem gerar PDF local em HTML impresso;
- leitura do PDF tambem depende de token no header.

## 8. Cliente de API e contratos esperados

O modulo `frontend/src/lib/api.ts` concentra boa parte da inteligencia transversal.

Comportamentos importantes:

- injeta `Authorization: Bearer <token>` quando houver sessao;
- aceita `JSON` e `FormData`;
- trata erro de rede com mensagem amigavel;
- em `401`, limpa sessao e redireciona para `#/login`;
- em `402`, interrompe silenciosamente para recursos premium;
- prioriza `json.message` vindo do backend;
- tem mensagens padrao amigaveis para `400`, `403`, `404`, `409`, `422`, `500` e `502`.

Funcionalidades auxiliares:

- `urlImagem`: corrige caminhos quebrados de upload reapontando para `/uploads/...`;
- `comprimirImagem`: recomprime imagem no browser antes de enviar;
- `getUser`, `getToken`, `setSession`, `clearSession`: camada de sessao local.

## 9. Mapa de APIs consumidas pelo frontend

### 9.1 Autenticacao

- `POST /login.php`
- `POST /logout.php`

### 9.2 Empresas

- `POST /empresas/cadastro_publico.php`
- `GET/PUT /empresas/empresas.php`

### 9.3 Dashboard

- `GET /dashboard/indicadores.php`

### 9.4 Cadastros base

- `GET/POST/PUT/DELETE /cadastros/unidades.php`
- `GET/POST/PUT/DELETE /cadastros/pisos.php`
- `GET/POST/PUT/DELETE /cadastros/locais.php`
- `GET/POST/PUT/DELETE /cadastros/categorias.php`
- `GET/POST/PUT/DELETE /cadastros/tecnicos.php`

### 9.5 Usuarios

- `GET/POST/PUT/DELETE /usuarios/usuarios.php`

### 9.6 Configuracao da empresa

- `GET/PUT /config_empresa/configuracoes.php`
- `POST /config_empresa/logo.php`

### 9.7 Equipamentos

- `GET/POST/PUT/DELETE /ativos/ativos.php`
- `POST /ativos/foto.php`
- `GET /ativos/por_qr.php?codigo=...`

### 9.8 Checklist

- `GET/POST/PUT/DELETE /checklist/modelos.php`
- `GET/POST/PUT/DELETE /checklist/itens.php`
- `GET /checklist/por_os.php?os_id=...`
- `GET /checklist/por_categoria.php?categoria_id=...`
- `POST /checklist/imagem.php`
- `POST /checklist/respostas.php`

### 9.9 Estoque

- `GET/POST/PUT/DELETE /estoque/materiais.php`
- `GET/POST /estoque/movimentacoes.php`

### 9.10 Ordens de servico

- `GET /os/os_listar.php`
- `POST /os/os_criar.php`
- `GET /os/os_detalhe.php?id=...`
- `POST /os/os_atualizar_status.php`
- `POST /os/os_agendar.php`
- `POST /os/os_enviar_whatsapp.php`
- `POST /os/os_assinatura.php`
- `GET/POST/DELETE /os/os_imagens.php`
- `GET /os/os_pdf.php?id=...`
- `GET /os/os_relatorio.php`
- `GET /os/os_relatorio_pdf.php`

## 10. Acoplamento com o backend

O frontend esta claramente acoplado ao backend `app_lizzi_fa`, que ja esta organizado pelos mesmos dominios:

- `ativos`
- `cadastros`
- `checklist`
- `config_empresa`
- `dashboard`
- `empresas`
- `estoque`
- `os`
- `usuarios`

Isso indica uma separacao de responsabilidade coerente entre telas e modulos da API.

Tambem ha forte indicio de arquitetura multiempresa:

- `admin_geral` escolhe empresa no front;
- empresas pendentes nao possuem `db_nome`;
- comentarios e campos sugerem isolamento por ambiente/base.

## 11. Observacoes tecnicas relevantes

### 11.1 `API_BASE` esta hardcoded para estrutura aninhada

Em `frontend/src/config.ts`, o frontend aponta para:

- `https://alexios.com.br/app_lizzi_fa/app_lizzi_fa`

O proprio comentario indica que isso e uma adaptacao temporaria por estrutura aninhada no servidor.

Impacto:

- alta dependencia da topologia atual de deploy;
- risco de quebra em homologacao/producao se a pasta for reorganizada sem ajuste correspondente.

### 11.2 Ha sinais de problema de encoding

Varios arquivos exibem texto com caracteres corrompidos como:

- `ConfiguraÃ§Ã£o`
- `Ordens de ServiÃ§o`
- `pÃºblicas`

Isso indica provavel mistura de UTF-8 com leitura/gravacao em encoding incorreto.

Impacto:

- piora visual;
- risco de inconsistencias em textos, labels e documentos.

### 11.3 O frontend confia bastante no backend para regras finais

Apesar de o frontend bloquear muita coisa:

- permissao por perfil;
- plano premium;
- validacao de checklist;
- transicoes de status;

as regras criticas ainda precisam estar blindadas no backend, pois todo o cliente e executado no navegador.

### 11.4 O token vive em `localStorage`

Isso simplifica a sessao, mas aumenta exposicao em cenarios de XSS.

### 11.5 HashRouter foi escolhido por compatibilidade de hospedagem

O uso de `HashRouter` sugere preocupacao com deploy simples em hospedagem PHP/Apache sem configuracao mais elaborada de fallback de rotas.

## 12. Conclusao objetiva

O frontend do `lizzi_facilities` nao e apenas uma landing com login: ele ja representa um sistema operacional completo de facilities/manutencao com:

- onboarding comercial;
- autenticacao;
- multiempresa;
- gestao de usuarios e perfis;
- ordens de servico com ciclo operacional real;
- agenda;
- checklist tecnico;
- equipamentos com QR Code;
- estoque;
- relatorios;
- integracao com WhatsApp.

As regras mais marcantes hoje no frontend sao:

- separacao forte por perfil;
- separacao forte por plano;
- ciclo bem definido de status da OS;
- bloqueio de alteracoes em OS encerrada;
- checklist dinamico com validacoes;
- acoplamento direto ao backend PHP modular.

## 13. Proximos passos recomendados

- corrigir o problema de encoding em todos os arquivos do frontend;
- revisar e centralizar a matriz de permissoes para evitar regra espalhada;
- externalizar melhor `API_BASE` por ambiente;
- documentar formalmente o contrato das APIs consumidas;
- avaliar endurecimento de seguranca da sessao;
- revisar consistencia entre nomes de categoria, tipo de chamado e checklist;
- preparar uma futura refatoracao por dominios, pois a aplicacao ja tem volume funcional suficiente para isso.
