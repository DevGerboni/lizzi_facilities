<?php
// empresas/cadastro_publico.php — AUTO-CADASTRO PÚBLICO (sem auth).
// Fluxo com APROVAÇÃO: cria a empresa como 'inativo' (pendente) + o usuário admin,
// MAS NÃO cria o banco nem faz login. O banco é criado quando o admin_geral aprova
// (empresas/empresas.php, status -> ativo).
// POST { empresa_nome, plano?, admin_nome, admin_email, admin_senha, whatsapp?, documento?, website? }
require_once __DIR__ . '/../core/db.php';
require_once __DIR__ . '/../core/response.php';

corsPreflight();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonError('Método não permitido', 405);

$b = bodyJson();
if (!empty($b['website'])) jsonError('Cadastro inválido', 400); // honeypot anti-bot

$empresaNome = trim($b['empresa_nome'] ?? '');
$plano       = $b['plano'] ?? 'simples';
$adminNome   = trim($b['admin_nome'] ?? '');
$adminEmail  = trim($b['admin_email'] ?? '');
$adminSenha  = (string)($b['admin_senha'] ?? '');

if ($empresaNome === '' || $adminNome === '' || $adminEmail === '') jsonError('Preencha o nome da empresa, seu nome e o e-mail.', 422);
if (!filter_var($adminEmail, FILTER_VALIDATE_EMAIL))                jsonError('Informe um e-mail válido.', 422);
if (strlen($adminSenha) < 6)                                        jsonError('A senha deve ter ao menos 6 caracteres.', 422);
if (!in_array($plano, ['simples', 'premium'], true))               jsonError('Plano inválido.', 422);

$pdo = dbCentral();

$chk = $pdo->prepare("SELECT 1 FROM usuarios WHERE email = :e AND deleted_at IS NULL LIMIT 1");
$chk->execute([':e' => $adminEmail]);
if ($chk->fetch()) jsonError('Já existe uma conta com este e-mail.', 409);

$pdo->beginTransaction();
try {
    // 1) empresa fica PENDENTE (inativo) e sem banco até a aprovação
    $st = $pdo->prepare(
        "INSERT INTO empresas (nome, documento, email, whatsapp, plano, status)
         VALUES (:n, :doc, :em, :wa, :pl, 'inativo') RETURNING id"
    );
    $st->execute([
        ':n' => $empresaNome, ':doc' => $b['documento'] ?? null, ':em' => $adminEmail,
        ':wa' => $b['whatsapp'] ?? null, ':pl' => $plano,
    ]);
    $empresaId = (int)$st->fetchColumn();

    // 2) usuário admin da empresa
    $pdo->prepare(
        "INSERT INTO usuarios (empresa_id, nome, email, whatsapp, senha_hash, perfil, status)
         VALUES (:e, :n, :em, :wa, :h, 'admin_empresa', 'ativo')"
    )->execute([
        ':e' => $empresaId, ':n' => $adminNome, ':em' => $adminEmail,
        ':wa' => $b['whatsapp'] ?? null, ':h' => password_hash($adminSenha, PASSWORD_BCRYPT),
    ]);

    $pdo->commit();
} catch (Throwable $e) {
    $pdo->rollBack();
    error_log('[cadastro_publico] ' . $e->getMessage());
    jsonError('Não foi possível concluir seu cadastro agora. Tente novamente em instantes.', 500);
}

jsonResponse(
    ['empresa_id' => $empresaId, 'pendente' => true],
    true,
    'Cadastro recebido! Sua conta está em análise e será liberada em breve. Avisaremos assim que você puder acessar.',
    201
);
