<?php
// =============================================================================
// core/util.php — utilidades transversais.
// =============================================================================
require_once __DIR__ . '/db.php';

// Mapa [id => nome] de usuários (banco CENTRAL). Usado para enriquecer OS
// (nomes de técnico/solicitante que vivem no central).
function nomesDeUsuarios(array $ids): array {
    $ids = array_values(array_unique(array_filter(array_map('intval', $ids))));
    if (!$ids) return [];
    $in = implode(',', array_fill(0, count($ids), '?'));
    $st = dbCentral()->prepare("SELECT id, nome, email, whatsapp FROM usuarios WHERE id IN ($in)");
    $st->execute($ids);
    $map = [];
    foreach ($st->fetchAll() as $r) $map[(int)$r['id']] = $r;
    return $map;
}

// Dados de 1 usuário central (ou null).
function usuarioCentral(int $id): ?array {
    $st = dbCentral()->prepare("SELECT id, nome, email, telefone, whatsapp FROM usuarios WHERE id = :id");
    $st->execute([':id' => $id]);
    $r = $st->fetch();
    return $r ?: null;
}
