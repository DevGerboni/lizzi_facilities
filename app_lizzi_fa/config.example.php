<?php
// =============================================================================
// config.example.php — modelo de configuração.
// Copie para config.php e preencha a senha real. NÃO versionar o config.php.
// =============================================================================
return [
    'db' => [
        'host'          => '46.202.147.162',
        'port'          => '5432',
        'user'          => 'postgres',
        'pass'          => 'TROQUE_AQUI',
        'central'       => 'lizzi_facilities',   // banco central
        'tenant_prefix' => 'lizzi_emp_',         // <prefixo><id> = banco da empresa
    ],
    'debug' => false,                            // true = mostra a mensagem real do erro (só em dev)
    'auth' => [
        'token_ttl_horas' => 168,                // validade do token (7 dias)
    ],
    'app_base_url'         => 'https://alexios.com.br/app_lizzi_fa/',
    'uploads_dir'          => __DIR__ . '/uploads',
    // caminho do template SQL rodado ao criar o banco de cada empresa:
    'tenant_template_path' => __DIR__ . '/sql/tenant_template.sql',
    'n8n' => [
        'whatsapp_webhook_url' => '',
        'webhook_secret'       => '',
    ],
    'evolution' => [
        'api_url' => '',
        'api_key' => '',
    ],
];
