<?php
// cadastros/tecnicos.php — técnicos = usuários (central) perfil 'tecnico' + vínculo
// com unidades (tecnicos_unidades, no banco da empresa).
// GET (?id) | POST | PUT | DELETE (?id)
require_once __DIR__ . '/../core/db.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../core/auth.php';
require_once __DIR__ . '/../core/crud.php';
require_once __DIR__ . '/../core/log.php';

corsPreflight();
[$pdo, $user] = contextoEmpresa();
$central = dbCentral();
$empresaId = (int)$user['empresa_id'];
$metodo = $_SERVER['REQUEST_METHOD'];

// devolve os ids de unidade associados a um técnico (no banco da empresa)
function unidadesDoTecnico(PDO $pdo, int $tecnicoId): array {
    $st = $pdo->prepare("SELECT unidade_id FROM tecnicos_unidades WHERE tecnico_id = :t ORDER BY unidade_id");
    $st->execute([':t' => $tecnicoId]);
    return array_map(fn($r) => (int)$r['unidade_id'], $st->fetchAll());
}

// regrava as associações técnico->unidades (valida que cada unidade existe)
function salvarUnidades(PDO $pdo, int $tecnicoId, array $unidades): void {
    $pdo->prepare("DELETE FROM tecnicos_unidades WHERE tecnico_id = :t")->execute([':t' => $tecnicoId]);
    foreach (array_unique(array_map('intval', $unidades)) as $uid) {
        if ($uid && existe($pdo, 'unidades', $uid)) {
            inserir($pdo, 'tecnicos_unidades', ['tecnico_id' => $tecnicoId, 'unidade_id' => $uid]);
        }
    }
}

if ($metodo === 'GET') {
    $id = (int)($_GET['id'] ?? 0);
    if ($id) {
        $st = $central->prepare(
            "SELECT id, nome, email, telefone, whatsapp, status FROM usuarios
              WHERE id = :id AND empresa_id = :e AND perfil = 'tecnico' AND deleted_at IS NULL");
        $st->execute([':id' => $id, ':e' => $empresaId]);
        $t = $st->fetch();
        if (!$t) jsonError('Técnico não encontrado', 404);
        $t['unidades'] = unidadesDoTecnico($pdo, (int)$t['id']);
        jsonResponse($t);
    }
    $st = $central->prepare(
        "SELECT id, nome, email, telefone, whatsapp, status FROM usuarios
          WHERE empresa_id = :e AND perfil = 'tecnico' AND deleted_at IS NULL ORDER BY nome");
    $st->execute([':e' => $empresaId]);
    $tecs = $st->fetchAll();
    foreach ($tecs as &$t) $t['unidades'] = unidadesDoTecnico($pdo, (int)$t['id']);
    jsonResponse($tecs);
}

exigirPerfil($user, ['admin_geral', 'admin_empresa', 'supervisor']);
$b = bodyJson();

if ($metodo === 'POST') {
    $nome  = trim($b['nome'] ?? '');
    $email = trim($b['email'] ?? '');
    $senha = (string)($b['senha'] ?? '');
    if ($nome === '' || $email === '' || $senha === '') jsonError('Informe nome, email e senha', 422);

    $chk = $central->prepare("SELECT 1 FROM usuarios WHERE email = :e AND deleted_at IS NULL LIMIT 1");
    $chk->execute([':e' => $email]);
    if ($chk->fetch()) jsonError('Já existe usuário com este e-mail', 409);

    $tecnicoId = inserir($central, 'usuarios', [
        'empresa_id' => $empresaId,
        'nome'       => $nome,
        'email'      => $email,
        'telefone'   => $b['telefone'] ?? null,
        'whatsapp'   => $b['whatsapp'] ?? null,
        'senha_hash' => password_hash($senha, PASSWORD_BCRYPT),
        'perfil'     => 'tecnico',
        'status'     => 'ativo',
    ]);
    salvarUnidades($pdo, $tecnicoId, $b['unidades'] ?? []);
    registrarLog($pdo, $user['id'], 'tecnicos', $tecnicoId, 'criar', null, ['nome' => $nome, 'email' => $email]);
    jsonResponse(['id' => $tecnicoId, 'unidades' => unidadesDoTecnico($pdo, $tecnicoId)], true, 'Técnico criado', 201);
}

if ($metodo === 'PUT') {
    $id = (int)($b['id'] ?? 0);
    if (!$id) jsonError('Informe o id', 422);
    // confirma que o técnico é desta empresa
    $chk = $central->prepare("SELECT 1 FROM usuarios WHERE id = :id AND empresa_id = :e AND perfil = 'tecnico' AND deleted_at IS NULL");
    $chk->execute([':id' => $id, ':e' => $empresaId]);
    if (!$chk->fetch()) jsonError('Técnico não encontrado', 404);

    $dados = camposInformados($b, ['nome', 'telefone', 'whatsapp', 'status']);
    if (!empty($b['senha'])) $dados['senha_hash'] = password_hash((string)$b['senha'], PASSWORD_BCRYPT);
    if ($dados) atualizar($central, 'usuarios', $id, $dados);
    if (array_key_exists('unidades', $b)) salvarUnidades($pdo, $id, $b['unidades'] ?? []);

    registrarLog($pdo, $user['id'], 'tecnicos', $id, 'alterar', null, $dados);
    jsonResponse(['id' => $id, 'unidades' => unidadesDoTecnico($pdo, $id)], true, 'Técnico atualizado');
}

if ($metodo === 'DELETE') {
    $id = (int)($_GET['id'] ?? ($b['id'] ?? 0));
    if (!$id) jsonError('Informe o id', 422);
    $st = $central->prepare(
        "UPDATE usuarios SET deleted_at = now()
          WHERE id = :id AND empresa_id = :e AND perfil = 'tecnico' AND deleted_at IS NULL");
    $st->execute([':id' => $id, ':e' => $empresaId]);
    if (!$st->rowCount()) jsonError('Técnico não encontrado', 404);
    $pdo->prepare("DELETE FROM tecnicos_unidades WHERE tecnico_id = :t")->execute([':t' => $id]);
    registrarLog($pdo, $user['id'], 'tecnicos', $id, 'excluir');
    jsonResponse(['id' => $id], true, 'Técnico excluído');
}

jsonError('Método não permitido', 405);
