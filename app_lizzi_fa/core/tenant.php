<?php
// =============================================================================
// core/tenant.php — conexão dinâmica no banco da empresa + criação no cadastro.
// =============================================================================
require_once __DIR__ . '/db.php';

// Só permite nomes de banco seguros (vão direto no SQL de CREATE DATABASE).
function nomeBancoValido(string $db): bool {
    return (bool)preg_match('/^[a-z0-9_]+$/', $db) && strlen($db) <= 63;
}

// Conecta no banco de uma empresa (ex.: lizzi_emp_1).
function conectarTenant(string $dbNome): PDO {
    if (!nomeBancoValido($dbNome)) {
        throw new InvalidArgumentException('Nome de banco inválido: ' . $dbNome);
    }
    $c = config()['db'];
    $dsn = "pgsql:host={$c['host']};port={$c['port']};dbname={$dbNome}";
    return new PDO($dsn, $c['user'], $c['pass'], pdoOpts());
}

// Cria o banco da empresa (lizzi_emp_<id>) e roda o tenant_template.sql.
// Retorna o nome do banco criado.
function criarBancoEmpresa(int $empresaId): string {
    $c  = config()['db'];
    $db = $c['tenant_prefix'] . $empresaId;
    if (!nomeBancoValido($db)) {
        throw new RuntimeException('Nome de banco inválido: ' . $db);
    }

    // Lê o template ANTES de criar o banco (se faltar, não cria banco órfão).
    $tplPath = config()['tenant_template_path'];
    $tpl = @file_get_contents($tplPath);
    if ($tpl === false) {
        throw new RuntimeException('tenant_template.sql não encontrado em ' . $tplPath);
    }

    // CREATE DATABASE precisa conectar no banco 'postgres' e rodar FORA de transação.
    $dsnRoot = "pgsql:host={$c['host']};port={$c['port']};dbname=postgres";
    $root = new PDO($dsnRoot, $c['user'], $c['pass'], pdoOpts());
    $root->exec("CREATE DATABASE {$db} WITH ENCODING 'UTF8' TEMPLATE template0");

    // Roda o schema dentro do banco novo. Se falhar, dropa o banco pra não deixar órfão.
    try {
        $pdo = conectarTenant($db);
        $pdo->exec($tpl);
        $pdo = null; // fecha a conexão antes de qualquer DROP
    } catch (Throwable $e) {
        $pdo = null;
        try { $root->exec("DROP DATABASE IF EXISTS {$db}"); } catch (Throwable $ignore) {}
        throw $e;
    }

    return $db;
}
