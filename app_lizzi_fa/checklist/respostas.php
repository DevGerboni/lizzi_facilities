<?php
// checklist/respostas.php — respostas do checklist numa OS (Premium).
// GET  ?ordem_servico_id=  -> lista
// POST { ordem_servico_id, respostas: [ {checklist_item_id, marcado, observacao?, imagem_url?} ] }
//      regrava as respostas da OS.
require_once __DIR__ . '/../core/db.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../core/auth.php';
require_once __DIR__ . '/../core/crud.php';
require_once __DIR__ . '/../core/log.php';

corsPreflight();
[$pdo, $user] = contextoEmpresa();
exigirPremium($user);
$metodo = $_SERVER['REQUEST_METHOD'];

if ($metodo === 'GET') {
    $osId = (int)($_GET['ordem_servico_id'] ?? 0);
    if (!$osId) jsonError('Informe a OS.', 422);
    $st = $pdo->prepare(
        "SELECT r.*, i.descricao FROM os_checklist_respostas r
           JOIN checklist_itens i ON i.id = r.checklist_item_id
          WHERE r.ordem_servico_id = :id ORDER BY i.ordem");
    $st->execute([':id' => $osId]);
    jsonResponse($st->fetchAll());
}

if ($metodo === 'POST') {
    $b = bodyJson();
    $osId = (int)($b['ordem_servico_id'] ?? 0);
    $respostas = $b['respostas'] ?? [];
    if (!$osId || !existe($pdo, 'ordens_servico', $osId)) jsonError('OS não encontrada.', 422);
    if (osEncerrada($pdo, $osId))                         jsonError('OS encerrada — checklist bloqueado.', 409);
    if (!is_array($respostas) || !$respostas)             jsonError('Envie as respostas', 422);

    // regrava (apaga as anteriores desta OS e insere as novas)
    $pdo->prepare("DELETE FROM os_checklist_respostas WHERE ordem_servico_id = :id")->execute([':id' => $osId]);
    $n = 0;
    foreach ($respostas as $r) {
        $itemId = (int)($r['checklist_item_id'] ?? 0);
        if (!$itemId) continue;
        inserir($pdo, 'os_checklist_respostas', [
            'ordem_servico_id'  => $osId,
            'checklist_item_id' => $itemId,
            'marcado'           => !empty($r['marcado']) ? 'true' : 'false',
            'observacao'        => $r['observacao'] ?? null,
            'imagem_url'        => $r['imagem_url'] ?? null,
            'usuario_id'        => $user['id'],
        ]);
        $n++;
    }
    registrarLog($pdo, $user['id'], 'os_checklist_respostas', $osId, 'alterar', null, ['itens' => $n]);
    jsonResponse(['ordem_servico_id' => $osId, 'salvos' => $n], true, 'Checklist salvo');
}

jsonError('Método não permitido', 405);
