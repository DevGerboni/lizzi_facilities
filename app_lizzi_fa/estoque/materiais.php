<?php
// estoque/materiais.php — CRUD de materiais (Premium). GET (?id) | POST | PUT | DELETE
require_once __DIR__ . '/../core/db.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../core/auth.php';
require_once __DIR__ . '/../core/crud.php';
require_once __DIR__ . '/../core/log.php';

corsPreflight();
[$pdo, $user] = contextoEmpresa();
// Materiais liberados em TODOS os planos (são usados na OS / no PDF). Sem gating de plano.
// O controle de estoque avançado (página Estoque) segue como Premium no frontend.
$metodo = $_SERVER['REQUEST_METHOD'];

if ($metodo === 'GET') {
    $id = (int)($_GET['id'] ?? 0);
    if ($id) {
        $st = $pdo->prepare("SELECT * FROM materiais WHERE id = :id AND deleted_at IS NULL");
        $st->execute([':id' => $id]);
        $row = $st->fetch();
        if (!$row) jsonError('Material não encontrado', 404);
        jsonResponse($row);
    }
    jsonResponse($pdo->query("SELECT * FROM materiais WHERE deleted_at IS NULL ORDER BY nome")->fetchAll());
}

exigirPerfil($user, ['admin_geral', 'admin_empresa', 'supervisor']);
$b = bodyJson();

if ($metodo === 'POST') {
    $nome = trim($b['nome'] ?? '');
    if ($nome === '') jsonError('Informe o nome do material', 422);
    $id = inserir($pdo, 'materiais', [
        'nome'             => $nome,
        'codigo'           => $b['codigo'] ?? null,
        'unidade_medida'   => $b['unidade_medida'] ?? null,
        'quantidade_atual' => $b['quantidade_atual'] ?? 0,
        'valor_unitario'   => $b['valor_unitario'] ?? 0,
        'status'           => $b['status'] ?? 'ativo',
    ]);
    registrarLog($pdo, $user['id'], 'materiais', $id, 'criar', null, ['nome' => $nome]);
    jsonResponse(['id' => $id], true, 'Material criado', 201);
}

if ($metodo === 'PUT') {
    $id = (int)($b['id'] ?? 0);
    if (!$id) jsonError('Informe o id', 422);
    $dados = camposInformados($b, ['nome', 'codigo', 'unidade_medida', 'valor_unitario', 'status']);
    if (!$dados) jsonError('Nada para atualizar', 422);
    if (!atualizar($pdo, 'materiais', $id, $dados)) jsonError('Material não encontrado', 404);
    registrarLog($pdo, $user['id'], 'materiais', $id, 'alterar', null, $dados);
    jsonResponse(['id' => $id], true, 'Material atualizado');
}

if ($metodo === 'DELETE') {
    $id = (int)($_GET['id'] ?? ($b['id'] ?? 0));
    if (!$id) jsonError('Informe o id', 422);
    if (!softDelete($pdo, 'materiais', $id)) jsonError('Material não encontrado', 404);
    registrarLog($pdo, $user['id'], 'materiais', $id, 'excluir');
    jsonResponse(['id' => $id], true, 'Material excluído');
}

jsonError('Método não permitido', 405);
