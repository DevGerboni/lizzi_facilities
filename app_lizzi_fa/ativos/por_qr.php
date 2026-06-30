<?php
// ativos/por_qr.php — resolve um ativo pelo código do QR (scan abre a tela do ativo).
// GET ?codigo=ATV-xxxx  -> ativo + histórico de OS daquele ativo
require_once __DIR__ . '/../core/db.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../core/auth.php';

corsPreflight();
[$pdo, $user] = contextoEmpresa();
exigirPremium($user);

$codigo = trim($_GET['codigo'] ?? '');
if ($codigo === '') jsonError('Informe o codigo do QR', 422);

$st = $pdo->prepare("SELECT * FROM ativos WHERE qr_code = :q AND deleted_at IS NULL LIMIT 1");
$st->execute([':q' => $codigo]);
$ativo = $st->fetch();
if (!$ativo) jsonError('Ativo não encontrado para este QR', 404);

// histórico de OS desse ativo
$os = $pdo->prepare(
    "SELECT id, codigo, tipo_os, status, created_at FROM ordens_servico
      WHERE ativo_id = :a AND deleted_at IS NULL ORDER BY created_at DESC");
$os->execute([':a' => $ativo['id']]);
$ativo['ordens_servico'] = $os->fetchAll();

jsonResponse($ativo);
