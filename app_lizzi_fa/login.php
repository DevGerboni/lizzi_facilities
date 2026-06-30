<?php
// =============================================================================
// login.php — autentica (email + senha), gera token e salva no central.
// POST { email, senha }
// =============================================================================
require_once __DIR__ . '/core/db.php';
require_once __DIR__ . '/core/response.php';

corsPreflight();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonError('Método não permitido', 405);

$b     = bodyJson();
$email = trim($b['email'] ?? '');
$senha = (string)($b['senha'] ?? '');
if ($email === '' || $senha === '') jsonError('Informe email e senha', 422);

$pdo = dbCentral();
$st  = $pdo->prepare(
    "SELECT u.*, e.db_nome, e.nome AS empresa_nome, e.plano, e.status AS empresa_status
       FROM usuarios u
       LEFT JOIN empresas e ON e.id = u.empresa_id
      WHERE u.email = :email AND u.deleted_at IS NULL AND u.status = 'ativo'
      LIMIT 1"
);
$st->execute([':email' => $email]);
$u = $st->fetch();

if (!$u || !password_verify($senha, $u['senha_hash'])) {
    jsonError('E-mail ou senha incorretos. Verifique e tente novamente.', 401);
}

// admin_geral (sem empresa) passa direto; demais só entram com a empresa ATIVA (aprovada).
if ($u['empresa_id'] !== null && ($u['empresa_status'] ?? '') !== 'ativo') {
    if (empty($u['db_nome'])) {
        jsonError('Sua conta ainda está em análise. Avisaremos assim que ela for liberada. 😊', 403);
    }
    jsonError('Sua conta está desativada no momento. Fale com o suporte para reativar.', 403);
}

// Gera o token e grava com validade.
$token = bin2hex(random_bytes(32));
$ttl   = (int)(config()['auth']['token_ttl_horas'] ?? 168);
$pdo->prepare(
    "UPDATE usuarios SET token = :t, token_expira_em = now() + ((:h) || ' hours')::interval WHERE id = :id"
)->execute([':t' => $token, ':h' => $ttl, ':id' => $u['id']]);

jsonResponse([
    'token'   => $token,
    'usuario' => [
        'id'           => (int)$u['id'],
        'nome'         => $u['nome'],
        'email'        => $u['email'],
        'perfil'       => $u['perfil'],
        'empresa_id'   => $u['empresa_id'] !== null ? (int)$u['empresa_id'] : null,
        'empresa_nome' => $u['empresa_nome'],
        'plano'        => $u['plano'],
        'db_nome'      => $u['db_nome'],
    ],
], true, 'Login efetuado');
