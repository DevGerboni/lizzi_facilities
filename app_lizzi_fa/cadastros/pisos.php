<?php
// cadastros/pisos.php — CRUD de pisos (vinculados à unidade).
// GET (?id ou ?unidade_id) | POST | PUT | DELETE (?id)
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
        $st = $pdo->prepare("SELECT * FROM pisos WHERE id = :id AND deleted_at IS NULL");
        $st->execute([':id' => $id]);
        $row = $st->fetch();
        if (!$row) jsonError('Piso não encontrado', 404);
        jsonResponse($row);
    }
    $uid = (int)($_GET['unidade_id'] ?? 0);
    if ($uid) {
        $st = $pdo->prepare("SELECT * FROM pisos WHERE unidade_id = :u AND deleted_at IS NULL ORDER BY nome");
        $st->execute([':u' => $uid]);
        jsonResponse($st->fetchAll());
    }
    jsonResponse($pdo->query("SELECT * FROM pisos WHERE deleted_at IS NULL ORDER BY nome")->fetchAll());
}

exigirPerfil($user, ['admin_geral', 'admin_empresa', 'supervisor']);
$b = bodyJson();

if ($metodo === 'POST') {
    $nome      = trim($b['nome'] ?? '');
    $unidadeId = (int)($b['unidade_id'] ?? 0);
    if ($nome === '')                          jsonError('Informe o nome do piso', 422);
    if (!$unidadeId)                           jsonError('Informe a unidade_id', 422);
    if (!existe($pdo, 'unidades', $unidadeId)) jsonError('Unidade inexistente', 422);
    $id = inserir($pdo, 'pisos', [
        'unidade_id' => $unidadeId,
        'nome'       => $nome,
        'status'     => $b['status'] ?? 'ativo',
    ]);
    registrarLog($pdo, $user['id'], 'pisos', $id, 'criar', null, ['nome' => $nome, 'unidade_id' => $unidadeId]);
    jsonResponse(['id' => $id], true, 'Piso criado', 201);
}

if ($metodo === 'PUT') {
    $id = (int)($b['id'] ?? 0);
    if (!$id) jsonError('Informe o id', 422);
    if (isset($b['unidade_id']) && !existe($pdo, 'unidades', (int)$b['unidade_id'])) {
        jsonError('Unidade inexistente', 422);
    }
    $dados = camposInformados($b, ['nome', 'unidade_id', 'status']);
    if (!$dados) jsonError('Nada para atualizar', 422);
    if (!atualizar($pdo, 'pisos', $id, $dados)) jsonError('Piso não encontrado', 404);
    registrarLog($pdo, $user['id'], 'pisos', $id, 'alterar', null, $dados);
    jsonResponse(['id' => $id], true, 'Piso atualizado');
}

if ($metodo === 'DELETE') {
    $id = (int)($_GET['id'] ?? ($b['id'] ?? 0));
    if (!$id) jsonError('Informe o id', 422);
    if (!softDelete($pdo, 'pisos', $id)) jsonError('Piso não encontrado', 404);
    registrarLog($pdo, $user['id'], 'pisos', $id, 'excluir');
    jsonResponse(['id' => $id], true, 'Piso excluído');
}

jsonError('Método não permitido', 405);
