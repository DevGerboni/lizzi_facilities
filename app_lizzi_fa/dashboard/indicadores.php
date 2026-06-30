<?php
// dashboard/indicadores.php — indicadores da empresa (todos os planos). GET.
// Todos os números vêm do banco da própria empresa.
require_once __DIR__ . '/../core/db.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../core/auth.php';
require_once __DIR__ . '/../core/util.php';

corsPreflight();
[$pdo, $user] = contextoEmpresa();
// Dashboard liberado para Simples e Premium (sem gating de plano).

$base = "FROM ordens_servico os WHERE os.deleted_at IS NULL";

$row = fn($sql) => $pdo->query($sql)->fetch();
$val = fn($sql) => $pdo->query($sql)->fetchColumn();
$tempo = "CASE
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

function minutosHHMM($v): string {
    if ($v === null || $v === '' || !is_numeric($v)) return '-';
    $min = max(0, (int)round((float)$v));
    return str_pad((string)intdiv($min, 60), 2, '0', STR_PAD_LEFT) . ':' . str_pad((string)($min % 60), 2, '0', STR_PAD_LEFT);
}

$totais = [
    'total'                => (int)$val("SELECT COUNT(*) $base"),
    'em_andamento'         => (int)$val("SELECT COUNT(*) $base AND status='em_andamento'"),
    'aguardando_aprovacao' => (int)$val("SELECT COUNT(*) $base AND status='aguardando_aprovacao'"),
    'concluidas'           => (int)$val("SELECT COUNT(*) $base AND status='concluido'"),
    'interrompidas'        => (int)$val("SELECT COUNT(*) $base AND status='interrompido'"),
    'canceladas'           => (int)$val("SELECT COUNT(*) $base AND status='cancelado'"),
    'atribuidas'           => (int)$val("SELECT COUNT(*) $base AND status='aberto'"),
    'abertas'              => (int)$val("SELECT COUNT(*) $base AND status='aberto'"),
    'tempo_medio_minutos'  => round((float)$val("SELECT COALESCE(AVG($tempo),0) $base AND status='concluido'"), 1),
    'horas_trabalhadas'    => round(((float)$val("SELECT COALESCE(SUM($tempo),0) $base")) / 60, 1),
    'tempo_medio_hhmm'     => minutosHHMM($val("SELECT COALESCE(AVG($tempo),0) $base AND status='concluido'")),
    'horas_trabalhadas_hhmm' => minutosHHMM($val("SELECT COALESCE(SUM($tempo),0) $base")),
    'alta_urgente'         => (int)$val("SELECT COUNT(*) $base AND prioridade IN ('alta','urgente')"),
];

// por técnico (resolve nomes no central)
$porTec = $pdo->query(
    "SELECT tecnico_id,
            COUNT(*) AS qtd,
            COUNT(*) FILTER (WHERE status = 'concluido') AS concluidas,
            COUNT(*) FILTER (WHERE status = 'interrompido') AS interrompidas,
            COUNT(*) FILTER (WHERE status = 'aguardando_aprovacao') AS aguardando_aprovacao,
            COALESCE(SUM($tempo), 0) AS minutos,
            COALESCE(AVG($tempo) FILTER (WHERE status = 'concluido'), 0) AS tempo_medio_minutos
       $base AND tecnico_id IS NOT NULL
      GROUP BY tecnico_id
      ORDER BY qtd DESC")->fetchAll();
$nomes = nomesDeUsuarios(array_map(fn($r) => $r['tecnico_id'], $porTec));
foreach ($porTec as &$t) {
    $t['tecnico_nome'] = $nomes[(int)$t['tecnico_id']]['nome'] ?? null;
    $t['horas'] = round(((float)$t['minutos']) / 60, 1);
    $t['tempo_medio_minutos'] = round((float)$t['tempo_medio_minutos'], 1);
    $t['horas_hhmm'] = minutosHHMM($t['minutos']);
    $t['tempo_medio_hhmm'] = minutosHHMM($t['tempo_medio_minutos']);
}
unset($t);

// por unidade
$porUni = $pdo->query(
    "SELECT os.unidade_id, u.nome AS unidade_nome, COUNT(*) AS qtd
       FROM ordens_servico os JOIN unidades u ON u.id = os.unidade_id
      WHERE os.deleted_at IS NULL GROUP BY os.unidade_id, u.nome ORDER BY qtd DESC")->fetchAll();

$porStatus = $pdo->query(
    "SELECT status, COUNT(*) AS qtd
       FROM ordens_servico
      WHERE deleted_at IS NULL
      GROUP BY status")->fetchAll();

$porPrioridade = $pdo->query(
    "SELECT prioridade, COUNT(*) AS qtd
       FROM ordens_servico
      WHERE deleted_at IS NULL
      GROUP BY prioridade")->fetchAll();

$porTipo = $pdo->query(
    "SELECT tipo_os AS tipo, COUNT(*) AS qtd
       FROM ordens_servico
      WHERE deleted_at IS NULL
      GROUP BY tipo_os
      ORDER BY qtd DESC, tipo_os")->fetchAll();

jsonResponse([
    'totais'      => $totais,
    'por_tecnico' => $porTec,
    'por_unidade' => $porUni,
    'por_status' => $porStatus,
    'por_prioridade' => $porPrioridade,
    'por_tipo' => $porTipo,
]);
