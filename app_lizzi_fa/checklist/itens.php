<?php
// checklist/itens.php — CRUD de itens de um modelo de checklist (Premium).
// GET (?id|?checklist_modelo_id) | POST | PUT | DELETE
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
    $id = (int)($_GET['id'] ?? 0);
    if ($id) {
        $st = $pdo->prepare("SELECT * FROM checklist_itens WHERE id = :id AND deleted_at IS NULL");
        $st->execute([':id' => $id]);
        $row = $st->fetch();
        if (!$row) jsonError('Item não encontrado', 404);
        jsonResponse($row);
    }
    $cond = ['deleted_at IS NULL']; $p = [];
    if (!empty($_GET['checklist_modelo_id'])) { $cond[] = 'checklist_modelo_id = :m'; $p[':m'] = (int)$_GET['checklist_modelo_id']; }
    $st = $pdo->prepare("SELECT * FROM checklist_itens WHERE " . implode(' AND ', $cond) . " ORDER BY ordem, id");
    $st->execute($p);
    jsonResponse($st->fetchAll());
}

exigirPerfil($user, ['admin_geral', 'admin_empresa', 'supervisor']);
$b = bodyJson();
$boolify = fn($v) => $v ? 'true' : 'false';

if ($metodo === 'POST') {
    $desc = trim($b['descricao'] ?? '');
    $mod  = (int)($b['checklist_modelo_id'] ?? 0);
    if ($desc === '')                                jsonError('Informe a descrição', 422);
    if (!$mod || !existe($pdo, 'checklist_modelos', $mod)) jsonError('Modelo inexistente', 422);
    $id = inserir($pdo, 'checklist_itens', [
        'checklist_modelo_id' => $mod,
        'descricao'           => $desc,
        'obrigatorio'         => $boolify($b['obrigatorio'] ?? false),
        'exige_foto'          => $boolify($b['exige_foto'] ?? false),
        'exige_observacao'    => $boolify($b['exige_observacao'] ?? false),
        'ordem'               => (int)($b['ordem'] ?? 0),
        'status'              => $b['status'] ?? 'ativo',
    ]);
    registrarLog($pdo, $user['id'], 'checklist_itens', $id, 'criar', null, ['descricao' => $desc]);
    jsonResponse(['id' => $id], true, 'Item criado', 201);
}

if ($metodo === 'PUT') {
    $id = (int)($b['id'] ?? 0);
    if (!$id) jsonError('Informe o id', 422);
    $dados = camposInformados($b, ['descricao', 'ordem', 'status']);
    foreach (['obrigatorio', 'exige_foto', 'exige_observacao'] as $c) {
        if (array_key_exists($c, $b)) $dados[$c] = $boolify($b[$c]);
    }
    if (!$dados) jsonError('Nada para atualizar', 422);
    if (!atualizar($pdo, 'checklist_itens', $id, $dados)) jsonError('Item não encontrado', 404);
    registrarLog($pdo, $user['id'], 'checklist_itens', $id, 'alterar', null, $dados);
    jsonResponse(['id' => $id], true, 'Item atualizado');
}

if ($metodo === 'DELETE') {
    $id = (int)($_GET['id'] ?? ($b['id'] ?? 0));
    if (!$id) jsonError('Informe o id', 422);
    if (!softDelete($pdo, 'checklist_itens', $id)) jsonError('Item não encontrado', 404);
    registrarLog($pdo, $user['id'], 'checklist_itens', $id, 'excluir');
    jsonResponse(['id' => $id], true, 'Item excluído');
}

jsonError('Método não permitido', 405);
