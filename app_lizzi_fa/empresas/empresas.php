<?php
// empresas/empresas.php — painel admin_geral: lista e gerencia empresas (banco central).
// GET (?id) | PUT { id, status?, plano?, nome?, ... }
// APROVAR = PUT status='ativo': se a empresa ainda não tem banco, ele é criado agora
//           (CREATE DATABASE lizzi_emp_<id> + tenant_template.sql + configuracoes_empresa).
require_once __DIR__ . '/../core/db.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../core/auth.php';
require_once __DIR__ . '/../core/tenant.php';

corsPreflight();
$user = autenticar();
exigirPerfil($user, ['admin_geral']);
$pdo = dbCentral();
$metodo = $_SERVER['REQUEST_METHOD'];

if ($metodo === 'GET') {
    $id = (int)($_GET['id'] ?? 0);
    if ($id) {
        $st = $pdo->prepare("SELECT * FROM empresas WHERE id = :id");
        $st->execute([':id' => $id]);
        $row = $st->fetch();
        if (!$row) jsonError('Empresa não encontrada', 404);
        jsonResponse($row);
    }
    // lista com contagem de usuários e flag de "pendente" (sem banco ainda)
    $rows = $pdo->query(
        "SELECT e.*, (e.db_nome IS NULL) AS pendente,
                (SELECT COUNT(*) FROM usuarios u WHERE u.empresa_id = e.id AND u.deleted_at IS NULL) AS usuarios
           FROM empresas e WHERE e.deleted_at IS NULL ORDER BY e.created_at DESC")->fetchAll();
    jsonResponse($rows);
}

if ($metodo !== 'PUT') jsonError('Método não permitido', 405);

$b  = bodyJson();
$id = (int)($b['id'] ?? 0);
if (!$id) jsonError('Informe o id da empresa', 422);

$st = $pdo->prepare("SELECT * FROM empresas WHERE id = :id AND deleted_at IS NULL");
$st->execute([':id' => $id]);
$empresa = $st->fetch();
if (!$empresa) jsonError('Empresa não encontrada', 404);

$dados = [];

// status
if (isset($b['status'])) {
    if (!in_array($b['status'], ['ativo', 'inativo'], true)) jsonError('Status inválido', 422);
    $dados['status'] = $b['status'];

    // APROVAÇÃO: ativar uma empresa que ainda não tem banco -> cria o ambiente dela
    if ($b['status'] === 'ativo' && empty($empresa['db_nome'])) {
        try {
            $db = criarBancoEmpresa($id);
        } catch (Throwable $e) {
            error_log('[empresas/aprovar] ' . $e->getMessage());
            jsonError('Não foi possível criar o ambiente da empresa ao aprovar. Tente novamente.', 500);
        }
        $dados['db_nome'] = $db;
        // linha inicial de configuração no banco da empresa
        try {
            conectarTenant($db)->prepare(
                "INSERT INTO configuracoes_empresa (nome_fantasia, cor_primaria, cor_secundaria, whatsapp_ativo)
                 VALUES (:n, '#1E66F5', '#FFFFFF', false)"
            )->execute([':n' => $empresa['nome']]);
        } catch (Throwable $e) { /* config é opcional; ignora se já existir */ }
    }
}

// plano
if (isset($b['plano'])) {
    if (!in_array($b['plano'], ['simples', 'premium'], true)) jsonError('Plano inválido', 422);
    $dados['plano'] = $b['plano'];
}
// outros campos editáveis
foreach (['nome', 'documento', 'email', 'telefone', 'whatsapp'] as $c) {
    if (array_key_exists($c, $b)) $dados[$c] = $b[$c];
}
if (!$dados) jsonError('Nada para atualizar', 422);

$sets = implode(', ', array_map(fn($c) => "$c = :$c", array_keys($dados)));
$up = $pdo->prepare("UPDATE empresas SET $sets WHERE id = :id");
foreach ($dados as $k => $v) $up->bindValue(":$k", $v);
$up->bindValue(':id', $id, PDO::PARAM_INT);
$up->execute();

jsonResponse(['id' => $id, 'db_nome' => $dados['db_nome'] ?? $empresa['db_nome']], true, 'Empresa atualizada');
