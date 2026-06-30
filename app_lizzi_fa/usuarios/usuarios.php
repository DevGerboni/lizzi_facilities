<?php
// usuarios/usuarios.php — gestão de usuários de uma empresa (banco central).
// Perfis gerenciáveis: admin_empresa, supervisor, tecnico, solicitante (NUNCA admin_geral).
// GET (?id) | POST | PUT | DELETE
// admin_empresa: opera na própria empresa. admin_geral: precisa informar empresa_id.
require_once __DIR__ . '/../core/db.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../core/auth.php';
require_once __DIR__ . '/../core/crud.php';

corsPreflight();
$user = autenticar();
exigirPerfil($user, ['admin_geral', 'admin_empresa', 'supervisor']);
$pdo = dbCentral();
$metodo = $_SERVER['REQUEST_METHOD'];
$b = ($metodo === 'GET') ? [] : bodyJson();

// resolve a empresa alvo
$empresaId = $user['empresa_id'] !== null
    ? (int)$user['empresa_id']
    : (int)($b['empresa_id'] ?? $_GET['empresa_id'] ?? 0);
if (!$empresaId) jsonError('Informe empresa_id', 422);

$perfisOk = ['admin_empresa', 'supervisor', 'tecnico', 'solicitante'];

if ($metodo === 'GET') {
    $id = (int)($_GET['id'] ?? 0);
    if ($id) {
        $st = $pdo->prepare("SELECT id,nome,email,telefone,whatsapp,perfil,status FROM usuarios
                              WHERE id=:id AND empresa_id=:e AND deleted_at IS NULL");
        $st->execute([':id' => $id, ':e' => $empresaId]);
        $row = $st->fetch();
        if (!$row) jsonError('Usuário não encontrado', 404);
        jsonResponse($row);
    }
    $cond = ['empresa_id = :e', 'deleted_at IS NULL']; $p = [':e' => $empresaId];
    if (!empty($_GET['perfil'])) { $cond[] = 'perfil = :pf'; $p[':pf'] = $_GET['perfil']; }
    $st = $pdo->prepare("SELECT id,nome,email,telefone,whatsapp,perfil,status FROM usuarios
                          WHERE " . implode(' AND ', $cond) . " ORDER BY nome");
    $st->execute($p);
    jsonResponse($st->fetchAll());
}

if ($metodo === 'POST') {
    $nome  = trim($b['nome'] ?? '');
    $email = trim($b['email'] ?? '');
    $senha = (string)($b['senha'] ?? '');
    $perfil = $b['perfil'] ?? '';
    if ($nome === '' || $email === '' || $senha === '') jsonError('Informe nome, email e senha', 422);
    if (!in_array($perfil, $perfisOk, true))            jsonError('Perfil inválido', 422);

    $chk = $pdo->prepare("SELECT 1 FROM usuarios WHERE email = :e AND deleted_at IS NULL LIMIT 1");
    $chk->execute([':e' => $email]);
    if ($chk->fetch()) jsonError('Já existe usuário com este e-mail', 409);

    $id = inserir($pdo, 'usuarios', [
        'empresa_id' => $empresaId,
        'nome'       => $nome,
        'email'      => $email,
        'telefone'   => $b['telefone'] ?? null,
        'whatsapp'   => $b['whatsapp'] ?? null,
        'senha_hash' => password_hash($senha, PASSWORD_BCRYPT),
        'perfil'     => $perfil,
        'status'     => 'ativo',
    ]);
    jsonResponse(['id' => $id], true, 'Usuário criado', 201);
}

if ($metodo === 'PUT') {
    $id = (int)($b['id'] ?? 0);
    if (!$id) jsonError('Informe o id', 422);
    $chk = $pdo->prepare("SELECT 1 FROM usuarios WHERE id=:id AND empresa_id=:e AND deleted_at IS NULL");
    $chk->execute([':id' => $id, ':e' => $empresaId]);
    if (!$chk->fetch()) jsonError('Usuário não encontrado', 404);

    $dados = camposInformados($b, ['nome', 'telefone', 'whatsapp', 'status']);
    if (isset($b['perfil'])) {
        if (!in_array($b['perfil'], $perfisOk, true)) jsonError('Perfil inválido', 422);
        $dados['perfil'] = $b['perfil'];
    }
    if (!empty($b['senha'])) $dados['senha_hash'] = password_hash((string)$b['senha'], PASSWORD_BCRYPT);
    if (!$dados) jsonError('Nada para atualizar', 422);
    atualizar($pdo, 'usuarios', $id, $dados);
    jsonResponse(['id' => $id], true, 'Usuário atualizado');
}

if ($metodo === 'DELETE') {
    $id = (int)($_GET['id'] ?? ($b['id'] ?? 0));
    if (!$id) jsonError('Informe o id', 422);
    $st = $pdo->prepare("UPDATE usuarios SET deleted_at=now() WHERE id=:id AND empresa_id=:e AND deleted_at IS NULL");
    $st->execute([':id' => $id, ':e' => $empresaId]);
    if (!$st->rowCount()) jsonError('Usuário não encontrado', 404);
    jsonResponse(['id' => $id], true, 'Usuário excluído');
}

jsonError('Método não permitido', 405);
