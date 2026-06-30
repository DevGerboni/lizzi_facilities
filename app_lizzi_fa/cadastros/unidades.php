<?php
// cadastros/unidades.php — CRUD de unidades (banco da empresa).
// GET (?id opcional) | POST | PUT | DELETE (?id)
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
        $st = $pdo->prepare("SELECT * FROM unidades WHERE id = :id AND deleted_at IS NULL");
        $st->execute([':id' => $id]);
        $row = $st->fetch();
        if (!$row) jsonError('Unidade não encontrada', 404);
        jsonResponse($row);
    }
    $rows = $pdo->query("SELECT * FROM unidades WHERE deleted_at IS NULL ORDER BY nome")->fetchAll();
    jsonResponse($rows);
}

// Mutações: somente admin_geral / admin_empresa
exigirPerfil($user, ['admin_geral', 'admin_empresa', 'supervisor']);
$b = bodyJson();

if ($metodo === 'POST') {
    $nome = trim($b['nome'] ?? '');
    if ($nome === '') jsonError('Informe o nome da unidade', 422);
    $id = inserir($pdo, 'unidades', [
        'nome'     => $nome,
        'endereco' => $b['endereco'] ?? null,
        'status'   => $b['status'] ?? 'ativo',
    ]);
    registrarLog($pdo, $user['id'], 'unidades', $id, 'criar', null, ['nome' => $nome]);
    jsonResponse(['id' => $id], true, 'Unidade criada', 201);
}

if ($metodo === 'PUT') {
    $id = (int)($b['id'] ?? 0);
    if (!$id) jsonError('Informe o id', 422);
    $dados = camposInformados($b, ['nome', 'endereco', 'status']);
    if (!$dados) jsonError('Nada para atualizar', 422);
    if (!atualizar($pdo, 'unidades', $id, $dados)) jsonError('Unidade não encontrada', 404);
    registrarLog($pdo, $user['id'], 'unidades', $id, 'alterar', null, $dados);
    jsonResponse(['id' => $id], true, 'Unidade atualizada');
}

if ($metodo === 'DELETE') {
    $id = (int)($_GET['id'] ?? ($b['id'] ?? 0));
    if (!$id) jsonError('Informe o id', 422);
    if (!softDelete($pdo, 'unidades', $id)) jsonError('Unidade não encontrada', 404);
    registrarLog($pdo, $user['id'], 'unidades', $id, 'excluir');
    jsonResponse(['id' => $id], true, 'Unidade excluída');
}

jsonError('Método não permitido', 405);
