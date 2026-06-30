<?php
// checklist/por_categoria.php — carrega o checklist (modelos + itens) de uma categoria.
// Usado ao abrir a OS conforme a categoria do ativo. GET ?categoria_id=
require_once __DIR__ . '/../core/db.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../core/auth.php';

corsPreflight();
[$pdo, $user] = contextoEmpresa();
exigirPremium($user);

$cat = (int)($_GET['categoria_id'] ?? 0);
if (!$cat) jsonError('Informe categoria_id', 422);

$mods = $pdo->prepare("SELECT * FROM checklist_modelos WHERE categoria_id = :c AND status='ativo' AND deleted_at IS NULL ORDER BY nome");
$mods->execute([':c' => $cat]);
$modelos = $mods->fetchAll();

$itensSt = $pdo->prepare("SELECT * FROM checklist_itens WHERE checklist_modelo_id = :m AND status='ativo' AND deleted_at IS NULL ORDER BY ordem, id");
foreach ($modelos as &$m) {
    $itensSt->execute([':m' => $m['id']]);
    $m['itens'] = $itensSt->fetchAll();
}

jsonResponse($modelos);
