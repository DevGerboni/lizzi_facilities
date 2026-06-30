<?php
// =============================================================================
// logout.php — invalida o token do usuário logado.
// POST (Authorization: Bearer <token>)
// =============================================================================
require_once __DIR__ . '/core/db.php';
require_once __DIR__ . '/core/response.php';
require_once __DIR__ . '/core/auth.php';

corsPreflight();
$user = autenticar();

dbCentral()
    ->prepare("UPDATE usuarios SET token = NULL, token_expira_em = NULL WHERE id = :id")
    ->execute([':id' => $user['id']]);

jsonResponse(null, true, 'Logout efetuado');
