<?php
// os/os_detalhe.php — detalhe completo da OS (+ imagens, histórico, checklist, materiais).
// GET ?id=
require_once __DIR__ . '/../core/db.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../core/auth.php';
require_once __DIR__ . '/../core/util.php';

corsPreflight();
[$pdo, $user] = contextoEmpresa();
$id = (int)($_GET['id'] ?? 0);
if (!$id) jsonError('Informe o id', 422);

$st = $pdo->prepare(
    "SELECT os.*, u.nome AS unidade_nome, p.nome AS piso_nome, l.nome AS local_nome,
            a.nome AS ativo_nome, a.categoria_id AS ativo_categoria_id
       FROM ordens_servico os
       LEFT JOIN unidades u ON u.id = os.unidade_id
       LEFT JOIN pisos    p ON p.id = os.piso_id
       LEFT JOIN locais   l ON l.id = os.local_id
       LEFT JOIN ativos a ON a.id = os.ativo_id
      WHERE os.id = :id AND os.deleted_at IS NULL");
$st->execute([':id' => $id]);
$os = $st->fetch();
if (!$os) jsonError('OS não encontrada', 404);

// nomes de técnico/solicitante (central)
$nomes = nomesDeUsuarios([$os['tecnico_id'], $os['solicitante_id']]);
$os['tecnico_nome']     = $os['tecnico_id']     ? ($nomes[(int)$os['tecnico_id']]['nome'] ?? null) : null;
$os['solicitante_nome'] = $os['solicitante_id'] ? ($nomes[(int)$os['solicitante_id']]['nome'] ?? null) : null;

// imagens
$img = $pdo->prepare("SELECT id, imagem_url, tipo, created_at FROM os_imagens WHERE ordem_servico_id = :id ORDER BY created_at");
$img->execute([':id' => $id]);
$os['imagens'] = $img->fetchAll();

// histórico
$hist = $pdo->prepare("SELECT id, usuario_id, acao, status_anterior, status_novo, observacao, created_at
                         FROM os_historico WHERE ordem_servico_id = :id ORDER BY created_at");
$hist->execute([':id' => $id]);
$os['historico'] = $hist->fetchAll();

// checklist respondido
$chk = $pdo->prepare(
    "SELECT r.id, r.checklist_item_id, i.descricao, r.marcado, r.observacao, r.imagem_url
       FROM os_checklist_respostas r
       JOIN checklist_itens i ON i.id = r.checklist_item_id
      WHERE r.ordem_servico_id = :id ORDER BY i.ordem");
$chk->execute([':id' => $id]);
$os['checklist'] = $chk->fetchAll();

// materiais usados
$mat = $pdo->prepare(
    "SELECT mm.id, mm.material_id, m.nome AS material_nome, mm.tipo, mm.quantidade,
            mm.valor_unitario, mm.valor_total, mm.created_at
       FROM materiais_movimentacoes mm
       JOIN materiais m ON m.id = mm.material_id
      WHERE mm.ordem_servico_id = :id ORDER BY mm.created_at");
$mat->execute([':id' => $id]);
$os['materiais'] = $mat->fetchAll();

jsonResponse($os);
