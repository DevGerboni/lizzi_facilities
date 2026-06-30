<?php
// os/os_relatorio.php - relatórios específicos de OS.
// GET ?relatorio=concluidos|assinaturas|imagens|checklist|tempos|materiais
//     &de=YYYY-MM-DD &ate=YYYY-MM-DD &unidade_id= &tecnico_id= &status=
require_once __DIR__ . '/../core/db.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../core/auth.php';
require_once __DIR__ . '/../core/util.php';

corsPreflight();
[$pdo, $user] = contextoEmpresa();
exigirPerfil($user, ['admin_geral', 'admin_empresa', 'supervisor']);

$relatorio = $_GET['relatorio'] ?? 'concluidos';
$permitidos = ['chamados', 'horas_tecnico', 'concluidos', 'assinaturas', 'imagens', 'checklist', 'tempos', 'materiais'];
if (!in_array($relatorio, $permitidos, true)) jsonError('Relatório inválido.', 422);

$where = ['os.deleted_at IS NULL'];
$params = [];
if (!empty($_GET['de']))         { $where[] = 'os.created_at::date >= :de';  $params[':de'] = $_GET['de']; }
if (!empty($_GET['ate']))        { $where[] = 'os.created_at::date <= :ate'; $params[':ate'] = $_GET['ate']; }
if (!empty($_GET['unidade_id'])) { $where[] = 'os.unidade_id = :uid';        $params[':uid'] = (int)$_GET['unidade_id']; }
if (!empty($_GET['tecnico_id'])) { $where[] = 'os.tecnico_id = :tid';        $params[':tid'] = (int)$_GET['tecnico_id']; }
if (!empty($_GET['status']))     { $where[] = 'os.status = :status';         $params[':status'] = $_GET['status']; }

function baseSelect(): string {
    return "os.id, os.codigo, os.status, os.tipo_os, os.prioridade, os.created_at,
            os.data_agendada, os.hora_agendada, os.inicio_atendimento, os.fim_atendimento,
            " . tempoExpr() . " AS tempo_total_minutos, os.tecnico_id, os.solicitante_id, os.avaria,
            os.assinatura_tecnico_url, os.assinatura_cliente_url,
            u.nome AS unidade_nome, p.nome AS piso_nome, l.nome AS local_nome, a.nome AS ativo_nome";
}

function tempoExpr(): string {
    return "CASE
                WHEN os.inicio_atendimento IS NULL THEN os.tempo_total_minutos
                WHEN os.status = 'em_andamento' THEN COALESCE(os.tempo_total_minutos, 0) +
                     CASE WHEN now() > os.inicio_atendimento
                          THEN GREATEST(1, CEIL(EXTRACT(EPOCH FROM (now() - os.inicio_atendimento)) / 60)::int)
                          ELSE 0 END
                WHEN os.tempo_total_minutos IS NOT NULL AND os.tempo_total_minutos > 0 THEN os.tempo_total_minutos
                ELSE CASE WHEN COALESCE(
                    os.fim_atendimento,
                    (SELECT h.created_at FROM os_historico h
                      WHERE h.ordem_servico_id = os.id AND h.status_novo = os.status
                      ORDER BY h.created_at DESC LIMIT 1),
                    os.updated_at
                ) >= os.inicio_atendimento
                THEN GREATEST(1, CEIL(EXTRACT(EPOCH FROM (
                    COALESCE(
                        os.fim_atendimento,
                        (SELECT h.created_at FROM os_historico h
                          WHERE h.ordem_servico_id = os.id AND h.status_novo = os.status
                          ORDER BY h.created_at DESC LIMIT 1),
                        os.updated_at
                    ) - os.inicio_atendimento
                )) / 60)::int)
                ELSE 0 END
            END";
}

function joinsBase(): string {
    return "LEFT JOIN unidades u ON u.id = os.unidade_id
            LEFT JOIN pisos p ON p.id = os.piso_id
            LEFT JOIN locais l ON l.id = os.local_id
            LEFT JOIN ativos a ON a.id = os.ativo_id";
}

function enriquecerUsuarios(array &$rows): void {
    $ids = [];
    foreach ($rows as $r) { $ids[] = $r['tecnico_id'] ?? null; $ids[] = $r['solicitante_id'] ?? null; }
    $nomes = nomesDeUsuarios($ids);
    foreach ($rows as &$r) {
        $r['tecnico_nome'] = !empty($r['tecnico_id']) ? ($nomes[(int)$r['tecnico_id']]['nome'] ?? null) : null;
        $r['solicitante_nome'] = !empty($r['solicitante_id']) ? ($nomes[(int)$r['solicitante_id']]['nome'] ?? null) : null;
    }
    unset($r);
}

function simNao($v): string {
    return $v ? 'Sim' : 'Não';
}

function minutosHHMM($v): string {
    if ($v === null || $v === '' || !is_numeric($v)) return '-';
    $min = max(0, (int)round((float)$v));
    return str_pad((string)intdiv($min, 60), 2, '0', STR_PAD_LEFT) . ':' . str_pad((string)($min % 60), 2, '0', STR_PAD_LEFT);
}

$cond = implode(' AND ', $where);
$titulo = '';
$descricao = '';
$colunas = [];
$linhas = [];

if ($relatorio === 'concluidos') {
    $titulo = 'Chamados concluídos';
    $descricao = 'OS concluídas com técnico, cliente, local, evidências, checklist, assinaturas e tempo de execução.';
    $sql = "SELECT " . baseSelect() . ",
                   (SELECT COUNT(*) FROM os_imagens img WHERE img.ordem_servico_id = os.id) AS imagens_qtd,
                   (SELECT COUNT(*) FROM os_checklist_respostas chk WHERE chk.ordem_servico_id = os.id) AS checklist_qtd,
                   (SELECT COALESCE(SUM(mat.valor_total), 0) FROM materiais_movimentacoes mat WHERE mat.ordem_servico_id = os.id AND mat.tipo = 'saida') AS materiais_total
              FROM ordens_servico os
              " . joinsBase() . "
             WHERE $cond AND os.status = 'concluido'
             ORDER BY os.fim_atendimento DESC NULLS LAST, os.created_at DESC";
    $st = $pdo->prepare($sql); $st->execute($params); $rows = $st->fetchAll(); enriquecerUsuarios($rows);
    $colunas = ['OS', 'Cliente', 'Técnico', 'Local', 'Equipamento', 'Agendada', 'Início', 'Fim', 'Tempo', 'Imagens', 'Checklist', 'Ass. técnico', 'Ass. cliente', 'Materiais'];
    foreach ($rows as $r) $linhas[] = [
        $r['codigo'], $r['solicitante_nome'] ?: '-', $r['tecnico_nome'] ?: '-',
        implode(' / ', array_filter([$r['unidade_nome'], $r['piso_nome'], $r['local_nome']])) ?: '-',
        $r['ativo_nome'] ?: '-', trim(($r['data_agendada'] ?: '-') . ' ' . ($r['hora_agendada'] ? substr((string)$r['hora_agendada'], 0, 5) : '')),
        $r['inicio_atendimento'] ?: '-', $r['fim_atendimento'] ?: '-', minutosHHMM($r['tempo_total_minutos'] ?? null),
        (int)$r['imagens_qtd'], (int)$r['checklist_qtd'], simNao($r['assinatura_tecnico_url']), simNao($r['assinatura_cliente_url']),
        'R$ ' . number_format((float)$r['materiais_total'], 2, ',', '.'),
    ];
} elseif ($relatorio === 'chamados') {
    $titulo = 'Relatório de chamados (completo)';
    $descricao = 'Todas as OS do período num único relatório, com todos os dados: status, local, equipamento, solicitante, técnico, prioridade, agendamento, tempos, imagens, checklist, assinaturas e materiais. Filtre por status para cada estado.';
    $sql = "SELECT " . baseSelect() . ",
                   (SELECT COUNT(*) FROM os_imagens img WHERE img.ordem_servico_id = os.id) AS imagens_qtd,
                   (SELECT COUNT(*) FROM os_checklist_respostas chk WHERE chk.ordem_servico_id = os.id) AS checklist_qtd,
                   (SELECT COALESCE(SUM(mat.valor_total),0) FROM materiais_movimentacoes mat WHERE mat.ordem_servico_id = os.id AND mat.tipo='saida') AS materiais_total,
                   (SELECT string_agg(m.nome || ' x' || (mm.quantidade)::float8, '; ')
                      FROM materiais_movimentacoes mm JOIN materiais m ON m.id = mm.material_id
                     WHERE mm.ordem_servico_id = os.id AND mm.tipo='saida') AS materiais_lista
              FROM ordens_servico os
              " . joinsBase() . "
             WHERE $cond
             ORDER BY os.created_at DESC";
    $st = $pdo->prepare($sql); $st->execute($params); $rows = $st->fetchAll(); enriquecerUsuarios($rows);
    $colunas = ['OS', 'Status', 'Tipo', 'Prioridade', 'Atribuído', 'Local', 'Equipamento', 'Solicitante', 'Técnico', 'Agendada', 'Início', 'Fim', 'Tempo de execução', 'Imagens', 'Checklist', 'Ass. técnico', 'Ass. cliente', 'Materiais', 'Custo materiais'];
    foreach ($rows as $r) $linhas[] = [
        $r['codigo'], $r['status'], $r['tipo_os'], $r['prioridade'], $r['created_at'],
        implode(' / ', array_filter([$r['unidade_nome'], $r['piso_nome'], $r['local_nome']])) ?: '-',
        $r['ativo_nome'] ?: '-', $r['solicitante_nome'] ?: '-', $r['tecnico_nome'] ?: '-',
        trim(($r['data_agendada'] ?: '') . ' ' . ($r['hora_agendada'] ? substr((string)$r['hora_agendada'], 0, 5) : '')) ?: '-',
        $r['inicio_atendimento'] ?: '-', $r['fim_atendimento'] ?: '-', minutosHHMM($r['tempo_total_minutos'] ?? null),
        (int)$r['imagens_qtd'], (int)$r['checklist_qtd'],
        simNao($r['assinatura_tecnico_url']), simNao($r['assinatura_cliente_url']),
        $r['materiais_lista'] ?: '-',
        'R$ ' . number_format((float)$r['materiais_total'], 2, ',', '.'),
    ];
} elseif ($relatorio === 'horas_tecnico') {
    $titulo = 'Horas trabalhadas por técnico';
    $descricao = 'Total de OS atendidas, concluídas, horas trabalhadas e tempo médio por técnico no período.';
    $tempo = tempoExpr();
    $sql = "SELECT os.tecnico_id,
                   COUNT(*) AS total,
                   COUNT(*) FILTER (WHERE os.status = 'concluido') AS concluidas,
                   COALESCE(SUM($tempo), 0) AS minutos,
                   COALESCE(AVG($tempo) FILTER (WHERE os.status = 'concluido'), 0) AS media
              FROM ordens_servico os
             WHERE $cond AND os.tecnico_id IS NOT NULL
             GROUP BY os.tecnico_id
             ORDER BY minutos DESC";
    $st = $pdo->prepare($sql); $st->execute($params); $rows = $st->fetchAll();
    $nomes = nomesDeUsuarios(array_map(fn($r) => $r['tecnico_id'], $rows));
    $colunas = ['Técnico', 'OS atendidas', 'Concluídas', 'Horas trabalhadas', 'Tempo médio'];
    foreach ($rows as $r) $linhas[] = [
        $nomes[(int)$r['tecnico_id']]['nome'] ?? ('#' . $r['tecnico_id']),
        (int)$r['total'], (int)$r['concluidas'],
        minutosHHMM($r['minutos']),
        minutosHHMM($r['media']),
    ];
} elseif ($relatorio === 'assinaturas') {
    $titulo = 'Assinaturas anexadas';
    $descricao = 'Controle de OS com assinatura do técnico e/ou do cliente.';
    $sql = "SELECT " . baseSelect() . " FROM ordens_servico os " . joinsBase() . "
             WHERE $cond AND (os.assinatura_tecnico_url IS NOT NULL OR os.assinatura_cliente_url IS NOT NULL)
             ORDER BY os.updated_at DESC NULLS LAST, os.created_at DESC";
    $st = $pdo->prepare($sql); $st->execute($params); $rows = $st->fetchAll(); enriquecerUsuarios($rows);
    $colunas = ['OS', 'Status', 'Cliente', 'Técnico', 'Local', 'Ass. técnico', 'Ass. cliente', 'Tempo'];
    foreach ($rows as $r) $linhas[] = [
        $r['codigo'], $r['status'], $r['solicitante_nome'] ?: '-', $r['tecnico_nome'] ?: '-',
        implode(' / ', array_filter([$r['unidade_nome'], $r['piso_nome'], $r['local_nome']])) ?: '-',
        simNao($r['assinatura_tecnico_url']), simNao($r['assinatura_cliente_url']), minutosHHMM($r['tempo_total_minutos'] ?? null),
    ];
} elseif ($relatorio === 'imagens') {
    $titulo = 'Imagens anexadas aos chamados';
    $descricao = 'Lista de evidências fotográficas por OS, separadas por tipo e data de envio.';
    $sql = "SELECT " . baseSelect() . ", img.tipo AS imagem_tipo, img.imagem_url, img.created_at AS imagem_created_at
              FROM os_imagens img
              JOIN ordens_servico os ON os.id = img.ordem_servico_id
              " . joinsBase() . "
             WHERE $cond
             ORDER BY img.created_at DESC";
    $st = $pdo->prepare($sql); $st->execute($params); $rows = $st->fetchAll(); enriquecerUsuarios($rows);
    $colunas = ['OS', 'Status', 'Tipo da imagem', 'Enviada em', 'Técnico', 'Cliente', 'Local', 'Arquivo'];
    foreach ($rows as $r) $linhas[] = [
        $r['codigo'], $r['status'], $r['imagem_tipo'], $r['imagem_created_at'], $r['tecnico_nome'] ?: '-',
        $r['solicitante_nome'] ?: '-', implode(' / ', array_filter([$r['unidade_nome'], $r['local_nome']])) ?: '-',
        $r['imagem_url'],
    ];
} elseif ($relatorio === 'checklist') {
    $titulo = 'Checklist anexado às OS';
    $descricao = 'Respostas de checklist, obrigatoriedade, observações e fotos exigidas.';
    $sql = "SELECT " . baseSelect() . ", cm.nome AS modelo_nome, ci.descricao AS item_descricao,
                   ci.obrigatorio, ci.exige_foto, ci.exige_observacao,
                   r.marcado, r.observacao AS resposta_observacao, r.imagem_url
              FROM os_checklist_respostas r
              JOIN checklist_itens ci ON ci.id = r.checklist_item_id
              JOIN checklist_modelos cm ON cm.id = ci.checklist_modelo_id
              JOIN ordens_servico os ON os.id = r.ordem_servico_id
              " . joinsBase() . "
             WHERE $cond
             ORDER BY os.created_at DESC, cm.nome, ci.ordem";
    $st = $pdo->prepare($sql); $st->execute($params); $rows = $st->fetchAll(); enriquecerUsuarios($rows);
    $colunas = ['OS', 'Status', 'Modelo', 'Item', 'Marcado', 'Obrigatório', 'Exige foto', 'Foto anexada', 'Observação'];
    foreach ($rows as $r) $linhas[] = [
        $r['codigo'], $r['status'], $r['modelo_nome'], $r['item_descricao'], simNao($r['marcado']),
        simNao($r['obrigatorio']), simNao($r['exige_foto']), simNao($r['imagem_url']), $r['resposta_observacao'] ?: '-',
    ];
} elseif ($relatorio === 'tempos') {
    $titulo = 'Tempo de execução e atendimento';
    $descricao = 'Prazos entre abertura, início, conclusão e tempo total registrado.';
    $sql = "SELECT " . baseSelect() . ",
                   ROUND(EXTRACT(EPOCH FROM (os.inicio_atendimento - os.created_at)) / 60) AS minutos_ate_inicio,
                   " . tempoExpr() . " AS minutos_execucao
              FROM ordens_servico os
              " . joinsBase() . "
             WHERE $cond
             ORDER BY os.created_at DESC";
    $st = $pdo->prepare($sql); $st->execute($params); $rows = $st->fetchAll(); enriquecerUsuarios($rows);
    $colunas = ['OS', 'Status', 'Atribuído', 'Início', 'Fim', 'Tempo até iniciar', 'Execução', 'Total executado', 'Técnico', 'Local'];
    foreach ($rows as $r) $linhas[] = [
        $r['codigo'], $r['status'], $r['created_at'] ?: '-', $r['inicio_atendimento'] ?: '-', $r['fim_atendimento'] ?: '-',
        minutosHHMM($r['minutos_ate_inicio'] ?? null), minutosHHMM($r['minutos_execucao'] ?? null), minutosHHMM($r['tempo_total_minutos'] ?? null),
        $r['tecnico_nome'] ?: '-', implode(' / ', array_filter([$r['unidade_nome'], $r['local_nome']])) ?: '-',
    ];
} else {
    $titulo = 'Materiais utilizados em OS';
    $descricao = 'Materiais baixados em OS, quantidade, valor e custo total por chamado.';
    $sql = "SELECT " . baseSelect() . ", m.nome AS material_nome, mm.quantidade, mm.valor_unitario, mm.valor_total, mm.created_at AS movimento_created_at
              FROM materiais_movimentacoes mm
              JOIN materiais m ON m.id = mm.material_id
              JOIN ordens_servico os ON os.id = mm.ordem_servico_id
              " . joinsBase() . "
             WHERE $cond AND mm.tipo = 'saida'
             ORDER BY mm.created_at DESC";
    $st = $pdo->prepare($sql); $st->execute($params); $rows = $st->fetchAll(); enriquecerUsuarios($rows);
    $colunas = ['OS', 'Status', 'Material', 'Quantidade', 'Valor unit.', 'Total', 'Quando', 'Técnico', 'Local'];
    foreach ($rows as $r) $linhas[] = [
        $r['codigo'], $r['status'], $r['material_nome'], $r['quantidade'],
        'R$ ' . number_format((float)$r['valor_unitario'], 2, ',', '.'),
        'R$ ' . number_format((float)$r['valor_total'], 2, ',', '.'),
        $r['movimento_created_at'], $r['tecnico_nome'] ?: '-',
        implode(' / ', array_filter([$r['unidade_nome'], $r['local_nome']])) ?: '-',
    ];
}

$cfg = $pdo->query("SELECT nome_fantasia, razao_social, documento, logo_url, cor_primaria FROM configuracoes_empresa LIMIT 1")->fetch() ?: [];

jsonResponse([
    'relatorio' => $relatorio,
    'titulo' => $titulo,
    'descricao' => $descricao,
    'empresa' => $cfg,
    'resumo' => [
        'total_linhas' => count($linhas),
        'gerado_em' => date('c'),
    ],
    'colunas' => $colunas,
    'linhas' => $linhas,
]);
