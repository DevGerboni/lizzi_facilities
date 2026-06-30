<?php
// =============================================================================
// core/crud.php — helpers genéricos de escrita (insert/update/soft delete).
// IMPORTANTE: $tabela e nomes de coluna são definidos PELO CÓDIGO (nunca pelo
// cliente). Os VALORES sempre vão por bind (prepared statement).
// =============================================================================

// Insere e retorna o id gerado. $dados = ['coluna' => valor, ...].
function inserir(PDO $pdo, string $tabela, array $dados): int {
    $cols = array_keys($dados);
    $ph   = array_map(fn($c) => ':' . $c, $cols);
    $sql  = "INSERT INTO {$tabela} (" . implode(', ', $cols) . ")
             VALUES (" . implode(', ', $ph) . ") RETURNING id";
    $st = $pdo->prepare($sql);
    foreach ($dados as $k => $v) $st->bindValue(':' . $k, $v);
    $st->execute();
    return (int)$st->fetchColumn();
}

// Atualiza por id (respeita soft delete). Retorna nº de linhas afetadas.
function atualizar(PDO $pdo, string $tabela, int $id, array $dados): int {
    if (!$dados) return 0;
    $sets = implode(', ', array_map(fn($c) => "{$c} = :{$c}", array_keys($dados)));
    $sql  = "UPDATE {$tabela} SET {$sets} WHERE id = :id AND deleted_at IS NULL";
    $st = $pdo->prepare($sql);
    foreach ($dados as $k => $v) $st->bindValue(':' . $k, $v);
    $st->bindValue(':id', $id, PDO::PARAM_INT);
    $st->execute();
    return $st->rowCount();
}

// Soft delete por id. Retorna nº de linhas afetadas.
function softDelete(PDO $pdo, string $tabela, int $id): int {
    $st = $pdo->prepare("UPDATE {$tabela} SET deleted_at = now() WHERE id = :id AND deleted_at IS NULL");
    $st->bindValue(':id', $id, PDO::PARAM_INT);
    $st->execute();
    return $st->rowCount();
}

// Verifica se um registro existe (não deletado) no banco atual.
function existe(PDO $pdo, string $tabela, int $id): bool {
    $st = $pdo->prepare("SELECT 1 FROM {$tabela} WHERE id = :id AND deleted_at IS NULL LIMIT 1");
    $st->bindValue(':id', $id, PDO::PARAM_INT);
    $st->execute();
    return (bool)$st->fetchColumn();
}

// OS encerrada (concluída ou cancelada) = TRAVADA: somente consulta/PDF.
function osEncerrada(PDO $pdo, int $osId): bool {
    $st = $pdo->prepare("SELECT status FROM ordens_servico WHERE id = :id AND deleted_at IS NULL");
    $st->bindValue(':id', $osId, PDO::PARAM_INT);
    $st->execute();
    return in_array($st->fetchColumn(), ['concluido', 'cancelado'], true);
}

// Coleta de $body apenas as chaves informadas (para UPDATE parcial).
function camposInformados(array $body, array $permitidas): array {
    $out = [];
    foreach ($permitidas as $c) {
        if (array_key_exists($c, $body)) $out[$c] = $body[$c];
    }
    return $out;
}
