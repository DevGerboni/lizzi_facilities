<?php
// =============================================================================
// core/whatsapp.php — envia ao webhook do N8N (que entrega via Evolution API).
// =============================================================================
require_once __DIR__ . '/db.php';

// Retorna [bool ok, string info]. Não lança — o chamador decide o que fazer.
function enviarWhatsappN8N(array $payload): array {
    $cfg = config()['n8n'] ?? [];
    $url = $cfg['whatsapp_webhook_url'] ?? '';
    if ($url === '') {
        return [false, 'N8N não configurado (config.n8n.whatsapp_webhook_url vazio)'];
    }
    $payload['secret'] = $cfg['webhook_secret'] ?? '';

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 20,
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS     => json_encode($payload, JSON_UNESCAPED_UNICODE),
    ]);
    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);
    curl_close($ch);

    if ($resp === false) return [false, 'Falha cURL: ' . $err];
    return [$code >= 200 && $code < 300, (string)$resp];
}
