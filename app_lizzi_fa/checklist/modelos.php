<?php
// checklist/modelos.php — CRUD de modelos de checklist por categoria (Premium).
// GET (?id|?categoria_id) | POST | PUT | DELETE
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
        $st = $pdo->prepare("SELECT * FROM checklist_modelos WHERE id = :id AND deleted_at IS NULL");
        $st->execute([':id' => $id]);
        $row = $st->fetch();
        if (!$row) jsonError('Modelo não encontrado', 404);
        jsonResponse($row);
    }
    $cond = ['deleted_at IS NULL']; $p = [];
    if (!empty($_GET['categoria_id'])) { $cond[] = 'categoria_id = :c'; $p[':c'] = (int)$_GET['categoria_id']; }
    $st = $pdo->prepare("SELECT * FROM checklist_modelos WHERE " . implode(' AND ', $cond) . " ORDER BY nome");
    $st->execute($p);
    jsonResponse($st->fetchAll());
}

exigirPerfil($user, ['admin_geral', 'admin_empresa', 'supervisor']);
$b = bodyJson();

if ($metodo === 'POST') {
    $nome = trim($b['nome'] ?? '');
    $cat  = (int)($b['categoria_id'] ?? 0);
    if ($nome === '')                       jsonError('Informe o nome do modelo', 422);
    if (!$cat || !existe($pdo, 'categorias', $cat)) jsonError('Categoria inexistente', 422);
    $id = inserir($pdo, 'checklist_modelos', ['categoria_id' => $cat, 'nome' => $nome, 'status' => $b['status'] ?? 'ativo']);
    registrarLog($pdo, $user['id'], 'checklist_modelos', $id, 'criar', null, ['nome' => $nome]);
    jsonResponse(['id' => $id], true, 'Modelo criado', 201);
}

if ($metodo === 'PUT') {
    $id = (int)($b['id'] ?? 0);
    if (!$id) jsonError('Informe o id', 422);
    $dados = camposInformados($b, ['categoria_id', 'nome', 'status']);
    if (!$dados) jsonError('Nada para atualizar', 422);
    if (!atualizar($pdo, 'checklist_modelos', $id, $dados)) jsonError('Modelo não encontrado', 404);
    registrarLog($pdo, $user['id'], 'checklist_modelos', $id, 'alterar', null, $dados);
    jsonResponse(['id' => $id], true, 'Modelo atualizado');
}

if ($metodo === 'DELETE') {
    $id = (int)($_GET['id'] ?? ($b['id'] ?? 0));
    if (!$id) jsonError('Informe o id', 422);
    if (!softDelete($pdo, 'checklist_modelos', $id)) jsonError('Modelo não encontrado', 404);
    registrarLog($pdo, $user['id'], 'checklist_modelos', $id, 'excluir');
    jsonResponse(['id' => $id], true, 'Modelo excluído');
}

jsonError('Método não permitido', 405);
