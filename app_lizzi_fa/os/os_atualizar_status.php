<?php
// os/os_atualizar_status.php - muda status da OS, controla tempo e grava historico.
// POST { id, status, observacao? }
require_once __DIR__ . '/../core/db.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../core/auth.php';
require_once __DIR__ . '/../core/log.php';

corsPreflight();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonError('Metodo nao permitido', 405);
[$pdo, $user] = contextoEmpresa();
$b = bodyJson();

$id   = (int)($b['id'] ?? 0);
$novo = $b['status'] ?? '';
$validos = ['aberto', 'em_andamento', 'interrompido', 'aguardando_aprovacao', 'concluido', 'cancelado'];

if (!$id) jsonError('Informe o id', 422);
if (!in_array($novo, $validos, true)) jsonError('Status invalido', 422);

$st = $pdo->prepare(
    "SELECT status, tecnico_id, inicio_atendimento, tempo_total_minutos
       FROM ordens_servico
      WHERE id = :id AND deleted_at IS NULL"
);
$st->execute([':id' => $id]);
$os = $st->fetch();
if (!$os) jsonError('OS nao encontrada', 404);

if ($user['perfil'] === 'solicitante') jsonError('Solicitante nao altera status', 403);
if ($user['perfil'] === 'tecnico' && (int)$os['tecnico_id'] !== (int)$user['id']) {
    jsonError('Tecnico so altera o status das proprias OS', 403);
}

$anterior = $os['status'];
if (in_array($anterior, ['concluido', 'cancelado'], true)) {
    jsonError('Esta OS esta encerrada e nao pode mais ser alterada.', 409);
}

$sets = ['status = :status'];
$params = [':status' => $novo, ':id' => $id];

// Iniciar ou retomar abre um novo intervalo de trabalho.
if ($novo === 'em_andamento' && ($anterior === 'aberto' || $anterior === 'interrompido' || empty($os['inicio_atendimento']))) {
    $sets[] = 'inicio_atendimento = now()';
    $sets[] = 'fim_atendimento = NULL';
}

// Sair da execucao fecha o intervalo atual e soma no total acumulado.
if (
    $anterior === 'em_andamento' &&
    in_array($novo, ['interrompido', 'aguardando_aprovacao', 'concluido', 'cancelado'], true) &&
    !empty($os['inicio_atendimento'])
) {
    $sets[] = 'fim_atendimento = now()';
    $sets[] = "tempo_total_minutos = COALESCE(tempo_total_minutos, 0) +
               CASE WHEN now() > inicio_atendimento
                    THEN GREATEST(1, CEIL(EXTRACT(EPOCH FROM (now() - inicio_atendimento)) / 60)::int)
                    ELSE 0 END";
}

if ($novo === 'concluido' && empty($os['inicio_atendimento']) && $os['tempo_total_minutos'] === null) {
    $sets[] = 'tempo_total_minutos = 0';
}

$pdo->prepare("UPDATE ordens_servico SET " . implode(', ', $sets) . " WHERE id = :id")->execute($params);

$pdo->prepare(
    "INSERT INTO os_historico (ordem_servico_id, usuario_id, acao, status_anterior, status_novo, observacao)
     VALUES (:os, :u, 'status', :ant, :novo, :obs)"
)->execute([
    ':os' => $id,
    ':u' => $user['id'],
    ':ant' => $anterior,
    ':novo' => $novo,
    ':obs' => $b['observacao'] ?? null,
]);

registrarLog($pdo, $user['id'], 'ordens_servico', $id, 'alterar', ['status' => $anterior], ['status' => $novo]);
jsonResponse(['id' => $id, 'status' => $novo], true, 'Status atualizado');
