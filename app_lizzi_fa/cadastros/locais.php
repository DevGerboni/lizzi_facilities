<?php
// cadastros/locais.php — CRUD de locais (vinculados ao piso).
// GET (?id ou ?piso_id) | POST | PUT | DELETE (?id)
require_once __DIR__ . '/../core/db.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../core/auth.php';
require_once __DIR__ . '/../core/crud.php';
require_once __DIR__ . '/../core/log.php';

corsPreflight();
[$pdo, $user] = contextoEmpresa();
$metodo = $_SERVER['REQUEST_METHOD'];

if ($metodo === 'GET') {
    $id = (int)($_GET['id'] ?? 0);
    if ($id) {
        $st = $pdo->prepare("SELECT * FROM locais WHERE id = :id AND deleted_at IS NULL");
        $st->execute([':id' => $id]);
        $row = $st->fetch();
        if (!$row) jsonError('Local não encontrado', 404);
        jsonResponse($row);
    }
    $pisoId = (int)($_GET['piso_id'] ?? 0);
    if ($pisoId) {
        $st = $pdo->prepare("SELECT * FROM locais WHERE piso_id = :p AND deleted_at IS NULL ORDER BY nome");
        $st->execute([':p' => $pisoId]);
        jsonResponse($st->fetchAll());
    }
    jsonResponse($pdo->query("SELECT * FROM locais WHERE deleted_at IS NULL ORDER BY nome")->fetchAll());
}

exigirPerfil($user, ['admin_geral', 'admin_empresa', 'supervisor']);
$b = bodyJson();

if ($metodo === 'POST') {
    $nome      = trim($b['nome'] ?? '');
    $unidadeId = (int)($b['unidade_id'] ?? 0);
    $pisoId    = (int)($b['piso_id'] ?? 0);
    if ($nome === '')                          jsonError('Informe o nome do local', 422);
    if (!$unidadeId || !$pisoId)               jsonError('Informe unidade_id e piso_id', 422);
    if (!existe($pdo, 'unidades', $unidadeId)) jsonError('Unidade inexistente', 422);
    if (!existe($pdo, 'pisos', $pisoId))       jsonError('Piso inexistente', 422);
    $id = inserir($pdo, 'locais', [
        'unidade_id' => $unidadeId,
        'piso_id'    => $pisoId,
        'nome'       => $nome,
        'status'     => $b['status'] ?? 'ativo',
    ]);
    registrarLog($pdo, $user['id'], 'locais', $id, 'criar', null, ['nome' => $nome, 'piso_id' => $pisoId]);
    jsonResponse(['id' => $id], true, 'Local criado', 201);
}

if ($metodo === 'PUT') {
    $id = (int)($b['id'] ?? 0);
    if (!$id) jsonError('Informe o id', 422);
    if (isset($b['unidade_id']) && !existe($pdo, 'unidades', (int)$b['unidade_id'])) jsonError('Unidade inexistente', 422);
    if (isset($b['piso_id'])    && !existe($pdo, 'pisos', (int)$b['piso_id']))       jsonError('Piso inexistente', 422);
    $dados = camposInformados($b, ['nome', 'unidade_id', 'piso_id', 'status']);
    if (!$dados) jsonError('Nada para atualizar', 422);
    if (!atualizar($pdo, 'locais', $id, $dados)) jsonError('Local não encontrado', 404);
    registrarLog($pdo, $user['id'], 'locais', $id, 'alterar', null, $dados);
    jsonResponse(['id' => $id], true, 'Local atualizado');
}

if ($metodo === 'DELETE') {
    $id = (int)($_GET['id'] ?? ($b['id'] ?? 0));
    if (!$id) jsonError('Informe o id', 422);
    if (!softDelete($pdo, 'locais', $id)) jsonError('Local não encontrado', 404);
    registrarLog($pdo, $user['id'], 'locais', $id, 'excluir');
    jsonResponse(['id' => $id], true, 'Local excluído');
}

jsonError('Método não permitido', 405);
