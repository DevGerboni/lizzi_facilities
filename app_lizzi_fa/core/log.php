<?php
// =============================================================================
// core/log.php — gravação de log (Regra 11).
// A tabela `logs` fica no banco da EMPRESA, então passe o PDO do tenant.
// =============================================================================

function registrarLog(PDO $pdo, ?int $usuarioId, string $entidade, ?int $entidadeId,
                      string $acao, $antes = null, $depois = null): void {
    $st = $pdo->prepare(
        "INSERT INTO logs (usuario_id, entidade, entidade_id, acao, dados_antes, dados_depois, ip)
         VALUES (:u, :e, :eid, :a, :da, :dd, :ip)"
    );
    $st->execute([
        ':u'   => $usuarioId,
        ':e'   => $entidade,
        ':eid' => $entidadeId,
        ':a'   => $acao, // 'criar' | 'alterar' | 'excluir'
        ':da'  => $antes  !== null ? json_encode($antes,  JSON_UNESCAPED_UNICODE) : null,
        ':dd'  => $depois !== null ? json_encode($depois, JSON_UNESCAPED_UNICODE) : null,
        ':ip'  => $_SERVER['REMOTE_ADDR'] ?? null,
    ]);
}
