<?php
// cadastros/categorias.php — CRUD de categorias (de ativos/chamados).
// GET (?id) | POST | PUT | DELETE (?id)
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
        $st = $pdo->prepare("SELECT * FROM categorias WHERE id = :id AND deleted_at IS NULL");
        $st->execute([':id' => $id]);
        $row = $st->fetch();
        if (!$row) jsonError('Categoria não encontrada', 404);
        jsonResponse($row);
    }
    jsonResponse($pdo->query("SELECT * FROM categorias WHERE deleted_at IS NULL ORDER BY nome")->fetchAll());
}

exigirPerfil($user, ['admin_geral', 'admin_empresa', 'supervisor']);
$b = bodyJson();
$tiposValidos = ['ativo', 'chamado', 'ambos'];

if ($metodo === 'POST') {
    $nome = trim($b['nome'] ?? '');
    $tipo = $b['tipo'] ?? 'ambos';
    if ($nome === '')                          jsonError('Informe o nome da categoria', 422);
    if (!in_array($tipo, $tiposValidos, true)) jsonError('Tipo inválido (ativo|chamado|ambos)', 422);
    $id = inserir($pdo, 'categorias', [
        'nome'   => $nome,
        'tipo'   => $tipo,
        'status' => $b['status'] ?? 'ativo',
    ]);
    registrarLog($pdo, $user['id'], 'categorias', $id, 'criar', null, ['nome' => $nome, 'tipo' => $tipo]);
    jsonResponse(['id' => $id], true, 'Categoria criada', 201);
}

if ($metodo === 'PUT') {
    $id = (int)($b['id'] ?? 0);
    if (!$id) jsonError('Informe o id', 422);
    if (isset($b['tipo']) && !in_array($b['tipo'], $tiposValidos, true)) jsonError('Tipo inválido', 422);
    $dados = camposInformados($b, ['nome', 'tipo', 'status']);
    if (!$dados) jsonError('Nada para atualizar', 422);
    if (!atualizar($pdo, 'categorias', $id, $dados)) jsonError('Categoria não encontrada', 404);
    registrarLog($pdo, $user['id'], 'categorias', $id, 'alterar', null, $dados);
    jsonResponse(['id' => $id], true, 'Categoria atualizada');
}

if ($metodo === 'DELETE') {
    $id = (int)($_GET['id'] ?? ($b['id'] ?? 0));
    if (!$id) jsonError('Informe o id', 422);
    if (!softDelete($pdo, 'categorias', $id)) jsonError('Categoria não encontrada', 404);
    registrarLog($pdo, $user['id'], 'categorias', $id, 'excluir');
    jsonResponse(['id' => $id], true, 'Categoria excluída');
}

jsonError('Método não permitido', 405);
