<?php
// =============================================================================
// core/auth.php — autenticação por TOKEN EM TABELA (banco central).
// =============================================================================
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/response.php';
require_once __DIR__ . '/tenant.php';

// Lê o token do header "Authorization: Bearer <token>".
function lerToken(): ?string {
    $auth = '';
    if (function_exists('getallheaders')) {
        $h = getallheaders();
        $auth = $h['Authorization'] ?? $h['authorization'] ?? '';
    }
    if (!$auth) {
        $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? ($_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '');
    }
    if (!$auth) return null;
    if (stripos($auth, 'Bearer ') === 0) return trim(substr($auth, 7));
    return trim($auth);
}

// Valida o token contra o central e retorna o usuário (com db_nome e plano da empresa).
// Encerra com 401 se inválido/expirado.
function autenticar(): array {
    $token = lerToken();
    if (!$token) jsonError('Token não fornecido', 401);

    $st = dbCentral()->prepare(
        "SELECT u.id, u.empresa_id, u.nome, u.email, u.perfil, e.db_nome, e.plano, e.status AS empresa_status
           FROM usuarios u
           LEFT JOIN empresas e ON e.id = u.empresa_id
          WHERE u.token = :t
            AND u.status = 'ativo'
            AND u.deleted_at IS NULL
            AND (u.token_expira_em IS NULL OR u.token_expira_em > now())
          LIMIT 1"
    );
    $st->execute([':t' => $token]);
    $u = $st->fetch();
    if (!$u) jsonError('Sua sessão expirou ou é inválida. Entre novamente.', 401);

    // empresa precisa estar ativa (admin_geral não tem empresa, passa direto)
    if ($u['empresa_id'] !== null && ($u['empresa_status'] ?? '') !== 'ativo') {
        jsonError('Sua conta está inativa ou em análise. Fale com o suporte.', 403);
    }

    $u['id']         = (int)$u['id'];
    $u['empresa_id'] = $u['empresa_id'] !== null ? (int)$u['empresa_id'] : null;
    return $u; // [id, empresa_id, nome, email, perfil, db_nome, plano, empresa_status]
}

// Garante que o usuário tem empresa/banco (não serve para admin_geral "puro").
function exigirEmpresa(array $user): string {
    if (empty($user['db_nome'])) jsonError('Usuário sem empresa/banco associado', 409);
    return $user['db_nome'];
}

// Garante que o perfil do usuário está na lista permitida.
function exigirPerfil(array $user, array $perfis): void {
    if (!in_array($user['perfil'], $perfis, true)) {
        jsonError('Sem permissão para esta ação', 403);
    }
}

// Gating de plano Premium (Seção 5 do DOC).
function exigirPremium(array $user): void {
    if (($user['plano'] ?? null) !== 'premium') {
        jsonError('Funcionalidade disponível apenas no plano Premium', 402);
    }
}

// Atalho usado por TODO endpoint operacional: autentica, garante empresa e
// devolve [PDO do banco da empresa, usuário]. admin_geral "puro" (sem empresa) é barrado.
function contextoEmpresa(): array {
    $user = autenticar();
    $db   = exigirEmpresa($user);
    $pdo  = conectarTenant($db);
    return [$pdo, $user];
}
