<?php
// =============================================================================
// empresas/empresa_criar.php — cadastra uma empresa e CRIA O BANCO dela.
// Só admin_geral. POST { nome, plano, documento?, email?, telefone?, whatsapp?,
//                        admin_nome?, admin_email?, admin_senha? }
// Fluxo: INSERT empresa -> CREATE DATABASE lizzi_emp_<id> -> roda template ->
//        grava db_nome -> cria usuário admin_empresa -> cria configuracoes_empresa.
// =============================================================================
require_once __DIR__ . '/../core/db.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../core/auth.php';
require_once __DIR__ . '/../core/tenant.php';

corsPreflight();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonError('Método não permitido', 405);

$user = autenticar();
exigirPerfil($user, ['admin_geral']);

$b      = bodyJson();
$nome   = trim($b['nome'] ?? '');
$plano  = $b['plano'] ?? 'simples';
$aNome  = trim($b['admin_nome'] ?? '');
$aEmail = trim($b['admin_email'] ?? '');
$aSenha = (string)($b['admin_senha'] ?? '');

if ($nome === '')                                jsonError('Informe o nome da empresa', 422);
if (!in_array($plano, ['simples', 'premium'], true)) jsonError('Plano inválido (simples|premium)', 422);

$pdo = dbCentral();

// Se vier admin, valida e-mail único ANTES de criar banco (evita órfão).
if ($aEmail !== '') {
    if ($aSenha === '') jsonError('Informe a senha do admin da empresa', 422);
    $chk = $pdo->prepare("SELECT 1 FROM usuarios WHERE email = :e AND deleted_at IS NULL LIMIT 1");
    $chk->execute([':e' => $aEmail]);
    if ($chk->fetch()) jsonError('Já existe usuário com este e-mail', 409);
}

// 1) cria a empresa (ainda sem db_nome)
$st = $pdo->prepare(
    "INSERT INTO empresas (nome, documento, email, telefone, whatsapp, plano, status)
     VALUES (:n, :doc, :em, :tel, :wa, :pl, 'ativo') RETURNING id"
);
$st->execute([
    ':n'   => $nome,
    ':doc' => $b['documento'] ?? null,
    ':em'  => $b['email'] ?? null,
    ':tel' => $b['telefone'] ?? null,
    ':wa'  => $b['whatsapp'] ?? null,
    ':pl'  => $plano,
]);
$empresaId = (int)$st->fetchColumn();

// 2) cria o banco da empresa + roda o template
try {
    $db = criarBancoEmpresa($empresaId);
} catch (Throwable $e) {
    // desfaz a empresa pra não ficar órfã (soft delete + inativo)
    $pdo->prepare("UPDATE empresas SET status = 'inativo', deleted_at = now() WHERE id = :id")
        ->execute([':id' => $empresaId]);
    error_log('[empresa_criar] falha ao criar banco: ' . $e->getMessage());
    jsonError('Não foi possível criar o ambiente da empresa agora. Tente novamente em instantes.', 500);
}

// 3) grava o db_nome
$pdo->prepare("UPDATE empresas SET db_nome = :db WHERE id = :id")
    ->execute([':db' => $db, ':id' => $empresaId]);

// 4) cria o usuário admin_empresa (se informado)
$adminCriado = null;
if ($aEmail !== '') {
    $hash = password_hash($aSenha, PASSWORD_BCRYPT);
    $pdo->prepare(
        "INSERT INTO usuarios (empresa_id, nome, email, senha_hash, perfil, status)
         VALUES (:e, :n, :em, :h, 'admin_empresa', 'ativo')"
    )->execute([':e' => $empresaId, ':n' => $aNome !== '' ? $aNome : $nome, ':em' => $aEmail, ':h' => $hash]);
    $adminCriado = $aEmail;
}

// 5) cria a linha inicial de configuracoes_empresa no banco da empresa
$tpdo = conectarTenant($db);
$tpdo->prepare(
    "INSERT INTO configuracoes_empresa (nome_fantasia, cor_primaria, cor_secundaria, whatsapp_ativo)
     VALUES (:n, '#1E66F5', '#FFFFFF', false)"
)->execute([':n' => $nome]);

jsonResponse([
    'empresa_id'    => $empresaId,
    'db_nome'       => $db,
    'plano'         => $plano,
    'admin_empresa' => $adminCriado,
], true, 'Empresa criada com sucesso');
