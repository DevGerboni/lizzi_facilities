<?php
// os/os_agendar.php — agenda / reatribui uma OS: define data, hora e técnico,
// volta o status para 'aberto' (Atribuído) e registra no histórico.
// POST { ordem_servico_id, data_agendada?, hora_agendada?, tecnico_id? }
require_once __DIR__ . '/../core/db.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../core/auth.php';
require_once __DIR__ . '/../core/crud.php';
require_once __DIR__ . '/../core/util.php';
require_once __DIR__ . '/../core/log.php';

corsPreflight();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonError('Método não permitido', 405);
[$pdo, $user] = contextoEmpresa();
exigirPerfil($user, ['admin_geral', 'admin_empresa', 'supervisor']);

$b = bodyJson();
$osId = (int)($b['ordem_servico_id'] ?? 0);
if (!$osId) jsonError('Informe a OS', 422);

$st = $pdo->prepare("SELECT status FROM ordens_servico WHERE id = :id AND deleted_at IS NULL");
$st->execute([':id' => $osId]);
$atual = $st->fetchColumn();
if ($atual === false) jsonError('OS não encontrada', 404);
if (in_array($atual, ['concluido', 'cancelado'], true)) jsonError('OS encerrada — não pode ser agendada.', 409);

$data = !empty($b['data_agendada']) ? $b['data_agendada'] : null;
$hora = !empty($b['hora_agendada']) ? $b['hora_agendada'] : null;
$tec  = !empty($b['tecnico_id'])    ? (int)$b['tecnico_id'] : null;

$pdo->prepare("UPDATE ordens_servico SET data_agendada = :d, hora_agendada = :h, tecnico_id = :t, status = 'aberto' WHERE id = :id")
    ->execute([':d' => $data, ':h' => $hora, ':t' => $tec, ':id' => $osId]);

$nomeTec = $tec ? (nomesDeUsuarios([$tec])[$tec]['nome'] ?? ('#' . $tec)) : null;
$obs = 'Agendado'
     . ($data ? ' para ' . $data . ($hora ? ' ' . substr((string)$hora, 0, 5) : '') : '')
     . ($nomeTec ? ' · técnico: ' . $nomeTec : '');

inserir($pdo, 'os_historico', [
    'ordem_servico_id' => $osId,
    'usuario_id'       => $user['id'],
    'acao'             => 'agendar',
    'status_anterior'  => $atual,
    'status_novo'      => 'aberto',
    'observacao'       => $obs,
]);
registrarLog($pdo, $user['id'], 'ordens_servico', $osId, 'alterar', null, ['acao' => 'agendar', 'data' => $data, 'hora' => $hora, 'tecnico_id' => $tec]);
jsonResponse(['id' => $osId], true, 'Agendamento salvo');
