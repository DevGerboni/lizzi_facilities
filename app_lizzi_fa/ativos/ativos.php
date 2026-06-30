<?php
// ativos/ativos.php — CRUD de ativos (Premium). GET (?id|?unidade_id|?categoria_id) | POST | PUT | DELETE
require_once __DIR__ . '/../core/db.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../core/auth.php';
require_once __DIR__ . '/../core/crud.php';
require_once __DIR__ . '/../core/log.php';

corsPreflight();
[$pdo, $user] = contextoEmpresa();
exigirPremium($user);
$metodo = $_SERVER['REQUEST_METHOD'];

function garantirColunaMarca(PDO $pdo): void {
    try {
        $pdo->exec("ALTER TABLE ativos ADD COLUMN IF NOT EXISTS marca VARCHAR(100)");
    } catch (Throwable $e) {
        error_log('[ativos/marca] ' . $e->getMessage());
        jsonError('A coluna marca ainda não existe no banco desta empresa. Rode a migração migracao_ativos_marca.sql.', 500);
    }
}

if ($metodo === 'GET') {
    $id = (int)($_GET['id'] ?? 0);
    if ($id) {
        $st = $pdo->prepare("SELECT * FROM ativos WHERE id = :id AND deleted_at IS NULL");
        $st->execute([':id' => $id]);
        $row = $st->fetch();
        if (!$row) jsonError('Ativo não encontrado', 404);
        jsonResponse($row);
    }
    $cond = ['deleted_at IS NULL']; $p = [];
    if (!empty($_GET['unidade_id']))   { $cond[] = 'unidade_id = :u';   $p[':u'] = (int)$_GET['unidade_id']; }
    if (!empty($_GET['categoria_id'])) { $cond[] = 'categoria_id = :c'; $p[':c'] = (int)$_GET['categoria_id']; }
    $st = $pdo->prepare("SELECT * FROM ativos WHERE " . implode(' AND ', $cond) . " ORDER BY nome");
    $st->execute($p);
    jsonResponse($st->fetchAll());
}

exigirPerfil($user, ['admin_geral', 'admin_empresa', 'supervisor']);
$b = bodyJson();

if ($metodo === 'POST') {
    garantirColunaMarca($pdo);
    $nome = trim($b['nome'] ?? '');
    $uid = (int)($b['unidade_id'] ?? 0); $pid = (int)($b['piso_id'] ?? 0); $lid = (int)($b['local_id'] ?? 0);
    if ($nome === '')                  jsonError('Informe o nome do ativo', 422);
    if (!$uid || !$pid || !$lid)       jsonError('Ativo exige unidade_id, piso_id e local_id', 422);
    if (!existe($pdo, 'unidades', $uid)) jsonError('Unidade inexistente', 422);
    if (!existe($pdo, 'pisos', $pid))    jsonError('Piso inexistente', 422);
    if (!existe($pdo, 'locais', $lid))   jsonError('Local inexistente', 422);
    if (!empty($b['categoria_id']) && !existe($pdo, 'categorias', (int)$b['categoria_id'])) jsonError('Categoria inexistente', 422);

    $qr = 'ATV-' . bin2hex(random_bytes(6)); // token estável do QR (conteúdo final: D9)
    $id = inserir($pdo, 'ativos', [
        'unidade_id'   => $uid,
        'piso_id'      => $pid,
        'local_id'     => $lid,
        'categoria_id' => !empty($b['categoria_id']) ? (int)$b['categoria_id'] : null,
        'nome'         => $nome,
        'patrimonio'   => $b['patrimonio'] ?? null,
        'marca'        => $b['marca'] ?? null,
        'fabricante'   => $b['fabricante'] ?? null,
        'modelo'       => $b['modelo'] ?? null,
        'numero_serie' => $b['numero_serie'] ?? null,
        'qr_code'      => $qr,
        'foto_url'     => $b['foto_url'] ?? null,
        'status'       => $b['status'] ?? 'ativo',
    ]);
    registrarLog($pdo, $user['id'], 'ativos', $id, 'criar', null, ['nome' => $nome, 'qr_code' => $qr]);
    jsonResponse(['id' => $id, 'qr_code' => $qr], true, 'Ativo criado', 201);
}

if ($metodo === 'PUT') {
    garantirColunaMarca($pdo);
    $id = (int)($b['id'] ?? 0);
    if (!$id) jsonError('Informe o id', 422);
    $dados = camposInformados($b, ['unidade_id','piso_id','local_id','categoria_id','nome','patrimonio','marca','fabricante','modelo','numero_serie','foto_url','status']);
    if (!$dados) jsonError('Nada para atualizar', 422);
    if (!atualizar($pdo, 'ativos', $id, $dados)) jsonError('Ativo não encontrado', 404);
    registrarLog($pdo, $user['id'], 'ativos', $id, 'alterar', null, $dados);
    jsonResponse(['id' => $id], true, 'Ativo atualizado');
}

if ($metodo === 'DELETE') {
    $id = (int)($_GET['id'] ?? ($b['id'] ?? 0));
    if (!$id) jsonError('Informe o id', 422);
    if (!softDelete($pdo, 'ativos', $id)) jsonError('Ativo não encontrado', 404);
    registrarLog($pdo, $user['id'], 'ativos', $id, 'excluir');
    jsonResponse(['id' => $id], true, 'Ativo excluído');
}

jsonError('Método não permitido', 405);
