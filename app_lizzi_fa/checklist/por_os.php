<?php
// checklist/por_os.php — modelos de checklist aplicáveis a uma OS, resolvidos por:
//  (1) categoria do ATIVO vinculado (se houver) e
//  (2) TIPO DE CHAMADO da OS (categoria com o mesmo nome de os.tipo_os).
// GET ?os_id=
require_once __DIR__ . '/../core/db.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../core/auth.php';

corsPreflight();
[$pdo, $user] = contextoEmpresa();
exigirPremium($user);

$osId = (int)($_GET['os_id'] ?? 0);
if (!$osId) jsonError('Informe a OS', 422);

$st = $pdo->prepare(
    "SELECT a.categoria_id AS ativo_cat, os.tipo_os
       FROM ordens_servico os
       LEFT JOIN ativos a ON a.id = os.ativo_id
      WHERE os.id = :id AND os.deleted_at IS NULL");
$st->execute([':id' => $osId]);
$os = $st->fetch();
if (!$os) jsonError('OS não encontrada', 404);

$catIds = [];
if (!empty($os['ativo_cat'])) $catIds[] = (int)$os['ativo_cat'];

// categoria do tipo de chamado: casa pelo nome (os.tipo_os guarda o nome do tipo)
if (!empty($os['tipo_os'])) {
    $c = $pdo->prepare("SELECT id FROM categorias
                         WHERE nome = :n AND deleted_at IS NULL
                         ORDER BY id LIMIT 1");
    $c->execute([':n' => $os['tipo_os']]);
    $cid = $c->fetchColumn();
    if ($cid) $catIds[] = (int)$cid;
}

$catIds = array_values(array_unique($catIds));
if (!$catIds) { jsonResponse([]); }

$in = implode(',', array_fill(0, count($catIds), '?'));
$mods = $pdo->prepare("SELECT * FROM checklist_modelos
                        WHERE categoria_id IN ($in) AND status = 'ativo' AND deleted_at IS NULL
                        ORDER BY nome");
$mods->execute($catIds);
$modelos = $mods->fetchAll();

$itensSt = $pdo->prepare("SELECT * FROM checklist_itens
                           WHERE checklist_modelo_id = :m AND status = 'ativo' AND deleted_at IS NULL
                           ORDER BY ordem, id");
foreach ($modelos as &$m) {
    $itensSt->execute([':m' => $m['id']]);
    $m['itens'] = $itensSt->fetchAll();
}
unset($m);

jsonResponse($modelos);
