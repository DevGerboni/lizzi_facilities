<?php
// config_empresa/logo.php - upload do logotipo da empresa.
// POST multipart { logo } -> atualiza configuracoes_empresa.logo_url.
require_once __DIR__ . '/../core/db.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../core/auth.php';
require_once __DIR__ . '/../core/crud.php';
require_once __DIR__ . '/../core/upload.php';
require_once __DIR__ . '/../core/log.php';

corsPreflight();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonError('Método não permitido', 405);

[$pdo, $user] = contextoEmpresa();
exigirPerfil($user, ['admin_geral', 'admin_empresa', 'supervisor']);

$cfg = $pdo->query("SELECT * FROM configuracoes_empresa ORDER BY id LIMIT 1")->fetch();
if (!$cfg) {
    $novoId = inserir($pdo, 'configuracoes_empresa', [
        'cor_primaria' => '#1E66F5',
        'cor_secundaria' => '#FFFFFF',
        'whatsapp_ativo' => 'false'
    ]);
    $cfg = $pdo->query("SELECT * FROM configuracoes_empresa WHERE id = $novoId")->fetch();
}

$url = salvarUpload('logo', 'logos');
if (!$url) jsonError('Envie a imagem no campo "logo"', 422);

$st = $pdo->prepare("UPDATE configuracoes_empresa SET logo_url = :url WHERE id = :id");
$st->execute([':url' => $url, ':id' => (int)$cfg['id']]);
registrarLog($pdo, $user['id'], 'configuracoes_empresa', (int)$cfg['id'], 'alterar', null, ['logo_url' => $url]);

jsonResponse(['id' => (int)$cfg['id'], 'logo_url' => $url], true, 'Logo atualizado');
