<?php
// =============================================================================
// core/db.php — configuração + conexão PDO com o banco CENTRAL.
// =============================================================================

function config(): array {
    static $cfg = null;
    if ($cfg === null) {
        $path = __DIR__ . '/../config.php';
        if (!file_exists($path)) {
            http_response_code(500);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['success' => false, 'error' => true,
                'message' => 'config.php não encontrado (copie de config.example.php)']);
            exit;
        }
        $cfg = require $path;
    }
    return $cfg;
}

function pdoOpts(): array {
    return [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];
}

// Conexão (singleton) com o banco central lizzi_facilities.
function dbCentral(): PDO {
    static $pdo = null;
    if ($pdo !== null) return $pdo;
    $c = config()['db'];
    $dsn = "pgsql:host={$c['host']};port={$c['port']};dbname={$c['central']}";
    $pdo = new PDO($dsn, $c['user'], $c['pass'], pdoOpts());
    return $pdo;
}
