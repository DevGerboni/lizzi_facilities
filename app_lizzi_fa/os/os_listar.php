<?php
// os/os_listar.php — lista OS (com nomes de unidade/piso/local/ativo e técnico/solicitante).
// GET ?status= &tecnico_id= &unidade_id=
// Escopo por perfil: tecnico vê as suas; solicitante vê as que abriu; demais veem tudo.
require_once __DIR__ . '/../core/db.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../core/auth.php';
require_once __DIR__ . '/../core/util.php';

corsPreflight();
[$pdo, $user] = contextoEmpresa();

$where = ['os.deleted_at IS NULL'];
$params = [];

if (!empty($_GET['status']))      { $where[] = 'os.status = :status';      $params[':status'] = $_GET['status']; }
if (!empty($_GET['unidade_id']))  { $where[] = 'os.unidade_id = :uid';      $params[':uid'] = (int)$_GET['unidade_id']; }
if (!empty($_GET['tecnico_id']))  { $where[] = 'os.tecnico_id = :tid';      $params[':tid'] = (int)$_GET['tecnico_id']; }

// escopo por perfil
if ($user['perfil'] === 'tecnico')      { $where[] = 'os.tecnico_id = :selft';    $params[':selft'] = $user['id']; }
elseif ($user['perfil'] === 'solicitante') { $where[] = 'os.solicitante_id = :selfs'; $params[':selfs'] = $user['id']; }

$sql = "SELECT os.*, u.nome AS unidade_nome, p.nome AS piso_nome, l.nome AS local_nome, a.nome AS ativo_nome
          FROM ordens_servico os
          LEFT JOIN unidades u ON u.id = os.unidade_id
          LEFT JOIN pisos    p ON p.id = os.piso_id
          LEFT JOIN locais   l ON l.id = os.local_id
          LEFT JOIN ativos a ON a.id = os.ativo_id
         WHERE " . implode(' AND ', $where) . "
         ORDER BY os.created_at DESC";
$st = $pdo->prepare($sql);
$st->execute($params);
$rows = $st->fetchAll();

// enriquece nomes de técnico/solicitante (banco central)
$ids = [];
foreach ($rows as $r) { $ids[] = $r['tecnico_id']; $ids[] = $r['solicitante_id']; }
$nomes = nomesDeUsuarios($ids);
foreach ($rows as &$r) {
    $r['tecnico_nome']     = $r['tecnico_id']     ? ($nomes[(int)$r['tecnico_id']]['nome'] ?? null) : null;
    $r['solicitante_nome'] = $r['solicitante_id'] ? ($nomes[(int)$r['solicitante_id']]['nome'] ?? null) : null;
}

jsonResponse($rows);
