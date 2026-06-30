<?php
// os/os_criar.php — abre uma OS (qualquer perfil autenticado). POST.
// Obrigatórios: unidade_id, piso_id, local_id, tipo_os.
// Opcionais: ativo_id (Premium), prioridade, avaria, descricao, observacao,
//            data_agendada, hora_agendada, tecnico_id, solicitante_id.
require_once __DIR__ . '/../core/db.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../core/auth.php';
require_once __DIR__ . '/../core/crud.php';
require_once __DIR__ . '/../core/log.php';

corsPreflight();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonError('Método não permitido', 405);
[$pdo, $user] = contextoEmpresa();
$b = bodyJson();

// Unidade/Piso/Local são OPCIONAIS (null quando não informados).
$unidadeId = !empty($b['unidade_id']) ? (int)$b['unidade_id'] : null;
$pisoId    = !empty($b['piso_id'])    ? (int)$b['piso_id']    : null;
$localId   = !empty($b['local_id'])   ? (int)$b['local_id']   : null;
$tipoOs    = trim((string)($b['tipo_os'] ?? ''));

if ($tipoOs === '') jsonError('Informe o tipo de chamado', 422);
if (strlen($tipoOs) > 150) jsonError('O tipo de chamado deve ter no máximo 150 caracteres', 422);
if ($unidadeId !== null && !existe($pdo, 'unidades', $unidadeId)) jsonError('Unidade inexistente', 422);
if ($pisoId    !== null && !existe($pdo, 'pisos', $pisoId))       jsonError('Piso inexistente', 422);
if ($localId   !== null && !existe($pdo, 'locais', $localId))     jsonError('Local inexistente', 422);

$prioridade = $b['prioridade'] ?? 'media';
if (!in_array($prioridade, ['baixa', 'media', 'alta', 'urgente'], true)) jsonError('Prioridade inválida', 422);

// ativo só no Premium. OS "por equipamento": herda unidade/piso/local do ativo
// quando a localização não foi informada manualmente.
$ativoId = !empty($b['ativo_id']) ? (int)$b['ativo_id'] : null;
if ($ativoId) {
    exigirPremium($user);
    $a = $pdo->prepare("SELECT unidade_id, piso_id, local_id FROM ativos WHERE id = :id AND deleted_at IS NULL");
    $a->execute([':id' => $ativoId]);
    $av = $a->fetch();
    if (!$av) jsonError('Ativo inexistente', 422);
    if ($unidadeId === null) $unidadeId = (int)$av['unidade_id'];
    if ($pisoId    === null) $pisoId    = (int)$av['piso_id'];
    if ($localId   === null) $localId   = (int)$av['local_id'];
}

$solicitanteId = (int)($b['solicitante_id'] ?? $user['id']); // default: quem abriu
$tecnicoId     = isset($b['tecnico_id']) && $b['tecnico_id'] !== '' ? (int)$b['tecnico_id'] : null;

$osId = inserir($pdo, 'ordens_servico', [
    'unidade_id'     => $unidadeId,
    'piso_id'        => $pisoId,
    'local_id'       => $localId,
    'ativo_id'       => $ativoId,
    'solicitante_id' => $solicitanteId,
    'tecnico_id'     => $tecnicoId,
    'tipo_os'        => $tipoOs,
    'prioridade'     => $prioridade,
    'avaria'         => $b['avaria'] ?? null,
    'descricao'      => $b['descricao'] ?? null,
    'observacao'     => $b['observacao'] ?? null,
    'data_agendada'  => $b['data_agendada'] ?? null,
    'hora_agendada'  => $b['hora_agendada'] ?? null,
    'status'         => 'aberto',
]);

// código gerado pelo trigger
$cod = $pdo->prepare("SELECT codigo FROM ordens_servico WHERE id = :id");
$cod->execute([':id' => $osId]);
$codigo = $cod->fetchColumn();

// histórico de abertura
inserir($pdo, 'os_historico', [
    'ordem_servico_id' => $osId,
    'usuario_id'       => $user['id'],
    'acao'             => 'criar',
    'status_anterior'  => null,
    'status_novo'      => 'aberto',
    'observacao'       => null,
]);

// imagens de abertura (opcional): array de URLs já enviadas
foreach (($b['imagens'] ?? []) as $url) {
    if (is_string($url) && $url !== '') {
        inserir($pdo, 'os_imagens', ['ordem_servico_id' => $osId, 'imagem_url' => $url, 'tipo' => 'abertura']);
    }
}

registrarLog($pdo, $user['id'], 'ordens_servico', $osId, 'criar', null, ['codigo' => $codigo]);
jsonResponse(['id' => $osId, 'codigo' => $codigo], true, 'OS criada', 201);
