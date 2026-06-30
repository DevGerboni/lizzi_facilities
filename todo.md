# TODO - Lizzi Facilities Mobile (React Native / Expo)

## 0. Referencias

- [ ] Usar `lizzi_facilities/ANALISE.MD` como fonte de verdade do mapeamento.
- [ ] Usar `lizzi_facilities/frontend` como referencia das regras de negocio ja implementadas.
- [ ] Usar `lizzi_facilities/app_lizzi_fa` como referencia dos endpoints e contratos reais.
- [ ] Manter o app mobile alinhado ao backend PHP e ao frontend web.

## 1. Objetivo do app mobile

- [ ] Posicionar o app mobile como app de campo do Lizzi Facilities.
- [ ] Priorizar uso rapido por tecnico, supervisor e equipe operacional.
- [ ] Garantir login rapido e simples.
- [ ] Garantir lista de OS funcional.
- [ ] Garantir agenda do tecnico funcional.
- [ ] Garantir abertura de nova OS.
- [ ] Garantir execucao de OS no celular.
- [ ] Garantir checklist tecnico no fluxo da OS.
- [ ] Garantir coleta de assinaturas no fluxo da OS.
- [ ] Garantir registro de evidencias e atualizacao de status.
- [ ] Evitar transformar o mobile numa copia completa do web logo no inicio.
- [ ] Priorizar operacao em campo antes de administracao completa.

## 2. Estado atual do mobile

### 2.1 O que existe hoje

- [ ] Considerar que o app atual ja tem login.
- [ ] Considerar que o app atual ja tem sessao com `AsyncStorage`.
- [ ] Considerar que o app atual ja tem lista de OS.
- [ ] Considerar que o app atual ja tem agenda.
- [ ] Considerar que o app atual ja tem criacao de OS.
- [ ] Considerar que o app atual ja tem detalhe de OS.
- [ ] Considerar que o app atual ja tem mudanca de status.
- [ ] Considerar que o app atual ja tem checklist basico.
- [ ] Considerar que o app atual ja tem assinaturas com `react-native-signature-canvas`.

### 2.2 Problemas atuais

- [x] Resolver o problema de toda a aplicacao estar concentrada em um unico `App.tsx`.
- [x] Remover `API_BASE` hardcoded de dentro do arquivo principal.
- [x] Separar regra de negocio da camada de UI.
- [x] Corrigir divergencias entre mobile e web nas regras de checklist.
- [x] Corrigir divergencias entre mobile e web nas regras de status da OS.
- [ ] Mapear e implementar os modulos que ainda faltam no app de campo.
- [x] Corrigir textos com problema de encoding.

### 2.3 Direcao de arquitetura

- [x] Refatorar o mobile para arquitetura simples por modulos.
- [x] Manter Expo + React Native.
- [x] Evitar Redux neste momento.
- [ ] Usar contexto de autenticacao e estado local simples.
- [x] Separar API, tipos, regras e UI.
- [x] Manter a manutencao facil para evolucao futura.

## 3. Arquitetura simples proposta

- [x] Criar `src/config/`.
- [x] Criar `src/lib/`.
- [x] Criar `src/modules/auth/`.
- [x] Criar `src/modules/os/`.
- [x] Criar `src/modules/agenda/`.
- [ ] Criar `src/modules/checklist/`.
- [ ] Criar `src/modules/signature/`.
- [ ] Criar `src/modules/ativos/`.
- [ ] Criar `src/modules/common/`.
- [x] Criar `src/components/`.
- [x] Criar `src/theme/`.
- [x] Criar `src/types/`.

### 3.1 Responsabilidades

- [x] Colocar `API_BASE`, chaves de storage e constantes em `config`.
- [x] Colocar cliente HTTP, helpers e formatadores em `lib`.
- [x] Colocar chamadas HTTP de dominio em `modules/*/api.ts`.
- [ ] Colocar contratos de dominio em `modules/*/types.ts`.
- [ ] Colocar regras de tela em `modules/*/hooks.ts` quando fizer sentido.
- [ ] Colocar telas por dominio em `modules/*/screens/`.
- [x] Colocar componentes reutilizaveis em `components`.
- [x] Colocar cores, espacos e tipografia em `theme`.
- [x] Colocar tipos compartilhados em `types`.

### 3.2 Regra de simplicidade

- [x] Evitar overengineering.
- [x] Evitar logica critica perdida dentro de JSX grande.
- [x] Dar nome claro para funcoes de regra.
- [x] Evitar chamadas de API espalhadas de forma desorganizada.

## 4. Regras globais do app mobile

### 4.1 Autenticacao e sessao

- [x] Fazer login via `POST /login.php`.
- [x] Fazer logout via `POST /logout.php`.
- [x] Armazenar `token` e `usuario` com `AsyncStorage`.
- [x] Limpar sessao em caso de `401`.
- [x] Redirecionar o usuario para login ao perder sessao.
- [x] Centralizar `TOKEN_KEY` e `USER_KEY`.

### 4.2 Perfis

- [ ] Reconhecer os perfis `admin_geral`, `admin_empresa`, `supervisor`, `tecnico` e `solicitante`.
- [ ] Priorizar a experiencia mobile para `tecnico`.
- [ ] Priorizar a experiencia mobile para `supervisor`.
- [ ] Priorizar a experiencia mobile para `admin_empresa`.
- [ ] Tratar `admin_geral` como perfil fora do foco principal do app de campo.
- [ ] Definir se `solicitante` tera uso real no mobile.

### 4.3 Planos

- [x] Respeitar `simples` e `premium`.
- [x] Derivar `isPremium` de `usuario.plano === 'premium'`.
- [x] Ocultar recursos premium no app quando o plano nao permitir.
- [x] Respeitar bloqueio de API para premium mesmo que a UI falhe.
- [x] Tratar `HTTP 402` sem quebrar o fluxo do app.

### 4.4 Erros

- [x] Exibir erro de rede com mensagem amigavel.
- [x] Priorizar `json.message` vindo do backend.
- [x] Evitar mostrar erro cru para o usuario final.
- [x] Criar componente padrao para `erro`, `ok` e `aviso`.

### 4.5 Texto e idioma

- [x] Corrigir todos os textos com encoding quebrado.
- [x] Padronizar todo o app em pt-BR.
- [x] Padronizar labels de status, prioridade e acoes.

## 5. Mapa de dominios do mobile

### 5.1 MVP de campo

- [x] Implementar autenticacao.
- [x] Implementar lista de OS.
- [x] Implementar agenda.
- [x] Implementar nova OS.
- [x] Implementar detalhe da OS.
- [x] Implementar mudanca de status.
- [x] Implementar checklist.
- [x] Implementar assinaturas.
- [x] Implementar imagens e evidencias da OS.

### 5.2 Segunda camada

- [ ] Implementar materiais usados na OS.
- [ ] Implementar envio de WhatsApp a partir da OS.
- [ ] Implementar abertura de PDF da OS.
- [ ] Implementar consulta de equipamento por QR.
- [ ] Implementar nova OS por equipamento.

### 5.3 Fora do foco inicial

- [ ] Deixar painel `admin_geral` fora do escopo inicial do mobile.
- [ ] Deixar configuracao institucional completa fora do escopo inicial do mobile.
- [ ] Deixar relatorios amplos fora do escopo inicial do mobile.
- [ ] Deixar CRUD administrativo completo fora do escopo inicial do mobile.

## 6. Regras da Ordem de Servico

### 6.1 Status oficiais

- [ ] Considerar `aberto` como status oficial.
- [ ] Considerar `em_andamento` como status oficial.
- [ ] Considerar `interrompido` como status oficial.
- [ ] Considerar `aguardando_aprovacao` como status oficial.
- [ ] Considerar `concluido` como status oficial.
- [ ] Considerar `cancelado` como status oficial.

### 6.2 Labels oficiais

- [x] Mapear `aberto` para `Atribuido`.
- [x] Mapear `em_andamento` para `Em execucao`.
- [ ] Mapear `interrompido` para `Interrompido`.
- [x] Mapear `aguardando_aprovacao` para `Aguardando aprovacao do cliente`.
- [x] Mapear `concluido` para `Concluido`.
- [ ] Mapear `cancelado` para `Cancelado`.

### 6.3 Maquina de estados oficial

- [x] Permitir `aberto -> em_andamento`.
- [x] Permitir `em_andamento -> interrompido`.
- [x] Permitir `em_andamento -> aguardando_aprovacao`.
- [x] Permitir `em_andamento -> concluido`.
- [x] Permitir `interrompido -> em_andamento`.
- [x] Permitir `aguardando_aprovacao -> aberto` com reagendamento.
- [x] Permitir cancelamento de estados ainda abertos.
- [x] Travar OS em `concluido`.
- [x] Travar OS em `cancelado`.

### 6.4 Correcoes de divergencia no mobile atual

- [x] Corrigir a regra atual do mobile que conclui apenas a partir de `aguardando_aprovacao`.
- [x] Alinhar a conclusao com a regra real do web.
- [x] Corrigir o retorno de `aguardando_aprovacao` para `aberto`.
- [x] Incluir o fluxo correto de reagendamento ao voltar para `aberto`.

### 6.5 Regras de travamento

- [x] Travar OS `concluido` para edicao.
- [x] Travar OS `cancelado` para edicao.
- [x] Bloquear novas imagens em OS encerrada.
- [x] Bloquear checklist em OS encerrada.
- [ ] Bloquear materiais em OS encerrada.
- [x] Bloquear assinaturas em OS encerrada.
- [x] Exibir aviso claro de OS somente leitura.

### 6.6 Campos principais da OS

- [ ] Mapear `codigo`.
- [ ] Mapear `status`.
- [ ] Mapear `tipo de chamado`.
- [ ] Mapear `prioridade`.
- [ ] Mapear `unidade / piso / local`.
- [ ] Mapear `equipamento`.
- [ ] Mapear `tecnico`.
- [ ] Mapear `solicitante`.
- [ ] Mapear `avaria`.
- [ ] Mapear `descricao`.
- [x] Mapear `observacao`.
- [ ] Mapear `data/hora agendada`.
- [ ] Mapear `inicio/fim atendimento`.
- [ ] Mapear `tempo total`.

## 7. Regras de criacao de OS

- [x] Carregar unidades.
- [x] Carregar pisos a partir da unidade.
- [x] Carregar locais a partir do piso.
- [x] Filtrar tecnicos por unidade quando aplicavel.
- [x] Permitir vincular equipamento no plano premium.
- [x] Permitir abrir OS por local sem equipamento.
- [x] Tornar tipo de chamado obrigatorio.
- [x] Definir prioridade padrao como `media`.
- [x] Permitir data agendada opcional.
- [x] Permitir hora agendada opcional.
- [x] Criar OS via `POST /os/os_criar.php`.
- [x] Abrir detalhe da OS apos criacao.
- [ ] Validar melhor campos obrigatorios antes do envio.
- [x] Exibir loading claro durante criacao.
- [x] Incluir evidencias de abertura no mobile.

## 8. Regras de checklist

### 8.1 Fonte de verdade

- [x] Carregar checklist por `GET /checklist/por_os.php?os_id=...`.
- [x] Parar de depender apenas de categoria do ativo.
- [x] Respeitar o contexto completo da OS.

### 8.2 Divergencia atual

- [x] Remover dependencia principal de `GET /checklist/por_categoria.php?categoria_id=...` no fluxo da OS.
- [x] Alinhar o mobile com o comportamento do web.

### 8.3 Regras por item

- [x] Respeitar item obrigatorio.
- [x] Respeitar item que exige foto.
- [x] Respeitar item que exige observacao.
- [x] Respeitar a ordem definida dos itens.

### 8.4 Salvamento

- [x] Salvar checklist via `POST /checklist/respostas.php`.
- [x] Subir imagem de item via `POST /checklist/imagem.php` quando necessario.
- [x] Recarregar respostas salvas ao abrir a OS.
- [x] Marcar visualmente itens pendentes.

### 8.5 Gap atual

- [x] Implementar foto por item de checklist no mobile.

## 9. Regras de assinatura

- [x] Implementar assinatura do tecnico.
- [x] Implementar assinatura do cliente.
- [x] Enviar assinatura via `POST /os/os_assinatura.php`.
- [x] Salvar assinatura como arquivo temporario antes do upload.
- [x] Bloquear assinatura em OS encerrada.
- [x] Exibir assinatura existente quando houver URL.
- [x] Impedir envio de assinatura vazia.

## 10. Regras de imagens e evidencias

- [x] Permitir imagens de `abertura`.
- [x] Permitir imagens de `execucao`.
- [x] Permitir imagens de `conclusao`.
- [x] Enviar imagem via `POST /os/os_imagens.php`.
- [x] Listar imagens existentes da OS.
- [x] Permitir excluir imagem enquanto a OS estiver aberta.
- [x] Bloquear envio e exclusao em OS encerrada.
- [x] Implementar esse fluxo no mobile, pois hoje ele nao existe.

## 11. Regras de agenda

- [x] Listar OS com `data_agendada`.
- [x] Ocultar concluidas e canceladas no foco operacional.
- [x] Ordenar por data e hora.
- [x] Abrir detalhe da OS direto pela agenda.
- [x] Manter botao de atualizar.
- [ ] Evoluir depois para filtros por tecnico e status, se necessario.

## 12. Regras de materiais e estoque

- [ ] Listar materiais usados na OS.
- [ ] Adicionar material na OS.
- [ ] Permitir cadastrar material novo sob demanda somente se essa regra continuar valida.
- [ ] Enviar consumo via `POST /estoque/movimentacoes.php`.
- [ ] Exibir total de materiais usados na OS.
- [ ] Bloquear alteracoes em OS encerrada.
- [ ] Manter estoque administrativo completo como foco do web, nao do mobile.

## 13. Regras de equipamentos e QR Code

- [ ] Permitir consulta de equipamento por QR no plano premium.
- [ ] Exibir identificacao do equipamento.
- [ ] Exibir historico de OS do equipamento.
- [ ] Permitir abrir nova OS a partir do equipamento.
- [ ] Consumir `GET /ativos/por_qr.php?codigo=...`.
- [ ] Definir se a leitura inicial sera manual ou por camera.
- [ ] Considerar consulta manual como primeira entrega.
- [ ] Considerar scanner de camera como evolucao posterior.

## 14. Regras de permissao no mobile

### 14.1 Acoes operacionais

- [ ] Garantir que tecnico veja OS e agenda.
- [ ] Garantir que tecnico execute OS, checklist e assinatura.
- [ ] Garantir que supervisor tenha acoes operacionais ampliadas se necessario.
- [ ] Garantir que admin_empresa tenha acoes operacionais ampliadas se necessario.

### 14.2 Acoes administrativas

- [ ] Definir se o mobile tera cadastro de usuario.
- [ ] Definir se o mobile tera cadastros mestre.
- [ ] Definir se o mobile tera reagendamento e troca de tecnico.
- [ ] Definir se o mobile tera disparo de WhatsApp.
- [ ] Manter o app de campo enxuto enquanto essas decisoes nao forem priorizadas.

## 15. Mapa de APIs do mobile

### 15.1 Auth

- [x] Consumir `POST /login.php`.
- [x] Consumir `POST /logout.php`.

### 15.2 Cadastros auxiliares

- [x] Consumir `GET /cadastros/unidades.php`.
- [x] Consumir `GET /cadastros/pisos.php?unidade_id=...`.
- [x] Consumir `GET /cadastros/locais.php?piso_id=...`.
- [x] Consumir `GET /cadastros/tecnicos.php`.
- [x] Consumir `GET /cadastros/categorias.php`.

### 15.3 Ordem de servico

- [x] Consumir `GET /os/os_listar.php`.
- [x] Consumir `POST /os/os_criar.php`.
- [x] Consumir `GET /os/os_detalhe.php?id=...`.
- [x] Consumir `POST /os/os_atualizar_status.php`.
- [x] Consumir `POST /os/os_agendar.php`.
- [ ] Consumir `POST /os/os_enviar_whatsapp.php`.
- [x] Consumir `POST /os/os_assinatura.php`.
- [x] Consumir `GET/POST/DELETE /os/os_imagens.php`.
- [ ] Consumir `GET /os/os_pdf.php?id=...`.

### 15.4 Checklist

- [x] Consumir `GET /checklist/por_os.php?os_id=...`.
- [x] Consumir `POST /checklist/respostas.php`.
- [x] Consumir `POST /checklist/imagem.php`.

### 15.5 Premium

- [x] Consumir `GET /ativos/ativos.php`.
- [ ] Consumir `GET /ativos/por_qr.php?codigo=...`.
- [ ] Consumir `GET /estoque/materiais.php`.
- [ ] Consumir `POST /estoque/movimentacoes.php`.

## 16. Fases de implementacao

### Fase 1 - Base tecnica

- [x] Criar estrutura `src/` por modulos.
- [x] Extrair `API_BASE`, chaves de storage e constantes.
- [x] Criar cliente `api.ts` unico.
- [ ] Criar servico/contexto de autenticacao.
- [x] Criar formatadores de status, prioridade, data e tempo.
- [x] Corrigir encoding dos textos.
- [x] Tirar logica de negocio do `App.tsx`.

### Fase 2 - Shell do app

- [ ] Criar `AuthProvider`.
- [x] Criar fluxo de login/logout.
- [x] Criar navegacao simples entre login, OS, agenda, nova OS e detalhe OS.
- [x] Criar topo, feedback e componentes base reutilizaveis.

### Fase 3 - OS core

- [x] Entregar lista de OS.
- [x] Entregar filtros minimos.
- [x] Entregar agenda.
- [x] Entregar nova OS com cascata unidade/piso/local.
- [x] Entregar detalhe da OS.
- [x] Entregar maquina de status alinhada ao web.
- [x] Entregar travamento de OS encerrada.

### Fase 4 - Evidencias e execucao

- [x] Entregar imagens da OS.
- [x] Entregar checklist por OS.
- [x] Entregar foto de item de checklist.
- [x] Entregar assinaturas.
- [x] Entregar validacoes claras para o tecnico.

### Fase 5 - Premium operacional

- [ ] Entregar equipamento por OS.
- [ ] Entregar consulta por QR.
- [ ] Entregar materiais da OS.
- [ ] Entregar consumo de estoque na OS.

### Fase 6 - Acabamento operacional

- [ ] Entregar WhatsApp a partir da OS.
- [ ] Entregar abertura de PDF da OS.
- [ ] Refinar loading por bloco.
- [ ] Refinar empty states.
- [ ] Refinar tratamento de erro padrao.
- [ ] Refinar UX de campo.

### Fase 7 - QA e release

- [ ] Validar Android real.
- [ ] Validar sessao expirada.
- [ ] Validar plano simples.
- [ ] Validar plano premium.
- [ ] Validar tecnico sem permissao administrativa.
- [ ] Validar OS encerrada travada.
- [ ] Validar checklist obrigatorio.
- [ ] Validar assinatura.
- [ ] Gerar APK release final.

## 17. Refatoracoes especificas no app atual

- [x] Quebrar `App.tsx` em modulos reais.
- [x] Mover `api()` para arquivo dedicado.
- [x] Mover `types` para arquivos separados.
- [x] Mover estilos para tema e componentes.
- [x] Extrair tela de login.
- [x] Extrair tela de lista de OS.
- [x] Extrair tela de agenda.
- [x] Extrair tela de nova OS.
- [x] Extrair tela de detalhe de OS.
- [x] Extrair componentes como `Button`, `Chip`, `Field`, `Message` e `Card`.
- [x] Alinhar checklist com `por_os`.
- [x] Alinhar status com a regra oficial do web.
- [x] Incluir imagens da OS.
- [ ] Incluir materiais da OS.
- [x] Remover textos quebrados por encoding.
- [x] Externalizar `API_BASE`.

## 18. Definition of Done do mobile

- [x] O app seguir arquitetura simples por modulos.
- [x] O `App.tsx` deixar de ser monolitico.
- [x] Login, sessao e logout funcionarem.
- [x] Lista, agenda, nova OS e detalhe funcionarem.
- [x] Status da OS respeitar a regra oficial do web/backend.
- [x] Checklist respeitar a regra oficial por OS.
- [x] Assinatura funcionar no Android real.
- [x] Imagens da OS funcionarem.
- [ ] Materiais da OS funcionarem.
- [x] Plano premium e simples serem respeitados.
- [x] Textos estarem em pt-BR correto.
- [x] Erros estarem amigaveis.
- [ ] APK release instalar e abrir sem tela vermelha.

## 19. Decisoes que devem ser mantidas

- [ ] Manter o mobile simples.
- [ ] Priorizar uso de campo.
- [ ] Evitar excesso de menu administrativo.
- [ ] Alinhar sempre com backend e web como fonte de regra.
- [ ] Nao duplicar regra de negocio sem necessidade.
- [ ] Quando houver divergencia entre mobile e web, corrigir o mobile para a regra oficial.
