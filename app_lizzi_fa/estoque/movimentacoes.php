<?php
// estoque/movimentacoes.php — entradas/saídas de material (Premium).
// GET  ?material_id= | ?ordem_servico_id=   -> lista
// POST { material_id, tipo:'entrada'|'saida', quantidade, valor_unitario?, ordem_servico_id?, observacao? }
//      -> registra a movimentação e ATUALIZA materiais.quantidade_atual (saída de OS = baixa).
require_once __DIR__ . '/../core/db.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../core/auth.php';
require_once __DIR__ . '/../core/crud.php';
require_once __DIR__ . '/../core/log.php';

corsPreflight();
[$pdo, $user] = contextoEmpresa();
// Liberado em todos os planos: registrar material usado numa OS não depende de Premium.
$metodo = $_SERVER['REQUEST_METHOD'];

if ($metodo === 'GET') {
    $cond = []; $p = [];
    if (!empty($_GET['material_id']))      { $cond[] = 'mm.material_id = :m';      $p[':m'] = (int)$_GET['material_id']; }
    if (!empty($_GET['ordem_servico_id'])) { $cond[] = 'mm.ordem_servico_id = :o'; $p[':o'] = (int)$_GET['ordem_servico_id']; }
    $w = $cond ? ('WHERE ' . implode(' AND ', $cond)) : '';
    $st = $pdo->prepare(
        "SELECT mm.*, m.nome AS material_nome FROM materiais_movimentacoes mm
           JOIN materiais m ON m.id = mm.material_id $w ORDER BY mm.created_at DESC");
    $st->execute($p);
    jsonResponse($st->fetchAll());
}

if ($metodo !== 'POST') jsonError('Método não permitido', 405);

$b = bodyJson();
$materialId = (int)($b['material_id'] ?? 0);
$tipo       = $b['tipo'] ?? '';
$qtd        = (float)($b['quantidade'] ?? 0);
$osId       = !empty($b['ordem_servico_id']) ? (int)$b['ordem_servico_id'] : null;

if (!$materialId || !existe($pdo, 'materiais', $materialId)) jsonError('Material inexistente', 422);
if (!in_array($tipo, ['entrada', 'saida'], true))            jsonError("Tipo deve ser 'entrada' ou 'saída'.", 422);
if ($qtd <= 0)                                               jsonError('Quantidade deve ser maior que zero.', 422);
if ($osId && !existe($pdo, 'ordens_servico', $osId))         jsonError('OS não encontrada.', 422);
if ($osId && osEncerrada($pdo, $osId))                       jsonError('OS encerrada — não é possível adicionar materiais.', 409);

// valor unitário: usa o informado ou o cadastrado no material
$mat = $pdo->prepare("SELECT quantidade_atual, valor_unitario FROM materiais WHERE id = :id");
$mat->execute([':id' => $materialId]);
$m = $mat->fetch();
$valorUnit = isset($b['valor_unitario']) ? (float)$b['valor_unitario'] : (float)$m['valor_unitario'];
$valorTotal = $valorUnit * $qtd;

// Saída AVULSA (sem OS) respeita o estoque. Saída vinculada a uma OS sempre é
// registrada (o material foi usado no serviço); o estoque só não fica negativo.
if ($tipo === 'saida' && !$osId && (float)$m['quantidade_atual'] < $qtd) {
    jsonError('Estoque insuficiente (atual: ' . $m['quantidade_atual'] . ')', 409);
}

$pdo->beginTransaction();
try {
    $movId = inserir($pdo, 'materiais_movimentacoes', [
        'material_id'      => $materialId,
        'ordem_servico_id' => $osId,
        'tipo'             => $tipo,
        'quantidade'       => $qtd,
        'valor_unitario'   => $valorUnit,
        'valor_total'      => $valorTotal,
        'usuario_id'       => $user['id'],
        'observacao'       => $b['observacao'] ?? null,
    ]);
    $delta = $tipo === 'entrada' ? $qtd : -$qtd;
    $pdo->prepare("UPDATE materiais SET quantidade_atual = GREATEST(0, quantidade_atual + :d) WHERE id = :id")
        ->execute([':d' => $delta, ':id' => $materialId]);
    $pdo->commit();
} catch (Throwable $e) {
    $pdo->rollBack();
    throw $e;
}

registrarLog($pdo, $user['id'], 'materiais_movimentacoes', $movId, 'criar', null,
    ['material_id' => $materialId, 'tipo' => $tipo, 'quantidade' => $qtd]);
jsonResponse(['id' => $movId, 'valor_total' => $valorTotal], true, 'Movimentação registrada', 201);
