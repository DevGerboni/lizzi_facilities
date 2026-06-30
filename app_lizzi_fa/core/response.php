<?php
// =============================================================================
// core/response.php — padrão de resposta JSON + CORS + leitura do body.
// =============================================================================

// Captura exceções/erros fatais não tratados e devolve JSON (em vez de 500 vazio).
// A mensagem real só aparece quando config['debug'] = true.
set_exception_handler(function (Throwable $e) {
    $debug = function_exists('config') && !empty(config()['debug']);
    if (!headers_sent()) {
        cors();
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
    }
    echo json_encode([
        'success' => false,
        'error'   => true,
        'message' => $debug ? $e->getMessage() : 'Erro interno',
        'data'    => $debug ? ['file' => $e->getFile(), 'line' => $e->getLine()] : null,
    ], JSON_UNESCAPED_UNICODE);
});

register_shutdown_function(function () {
    $err = error_get_last();
    if ($err && in_array($err['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
        $debug = function_exists('config') && !empty(config()['debug']);
        if (!headers_sent()) {
            cors();
            http_response_code(500);
            header('Content-Type: application/json; charset=utf-8');
        }
        echo json_encode([
            'success' => false,
            'error'   => true,
            'message' => $debug ? $err['message'] : 'Erro interno',
            'data'    => $debug ? ['file' => $err['file'], 'line' => $err['line']] : null,
        ], JSON_UNESCAPED_UNICODE);
    }
});

function cors(): void {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
}

// Trata preflight OPTIONS (chamar no topo de cada endpoint)
function corsPreflight(): void {
    cors();
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}

function jsonResponse($data = null, bool $success = true, string $message = '', int $code = 200): void {
    cors();
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => $success, 'data' => $data, 'message' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

function jsonError(string $message, int $code = 400, $extra = null): void {
    cors();
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'error' => true, 'message' => $message, 'data' => $extra], JSON_UNESCAPED_UNICODE);
    exit;
}

// Lê o corpo: JSON (application/json) ou form-data como fallback.
function bodyJson(): array {
    $raw = file_get_contents('php://input');
    $j = json_decode((string)$raw, true);
    if (is_array($j)) return $j;
    return $_POST ?: [];
}
