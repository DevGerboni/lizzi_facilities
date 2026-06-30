<?php
// =============================================================================
// core/upload.php — salva arquivo enviado e devolve a URL pública (só o caminho
// vai pro banco). Valida tipo e tamanho.
// =============================================================================
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/response.php';

function salvarUpload(string $campo, string $sub = 'os'): ?string {
    // POST que estourou o "post_max_size" do php.ini: o PHP esvazia $_FILES e
    // $_POST, e o arquivo "some" sem erro. Sem isto, vira o enganoso "Envie a imagem".
    if (empty($_FILES) && empty($_POST)
        && ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST'
        && (int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 0) {
        jsonError('A imagem é grande demais para o servidor (passou do limite "post_max_size" do PHP). Use uma imagem menor ou aumente o limite no servidor.', 413);
    }

    // Campo ausente / nenhum arquivo escolhido → opcional, o chamador decide.
    if (!isset($_FILES[$campo]) || $_FILES[$campo]['error'] === UPLOAD_ERR_NO_FILE) return null;

    $f = $_FILES[$campo];

    // Demais erros de upload do PHP (acima do "upload_max_filesize", envio parcial, etc.).
    if ($f['error'] !== UPLOAD_ERR_OK) jsonError(mensagemErroUpload((int)$f['error']), 422);

    $permitidos = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    if (!in_array($f['type'], $permitidos, true)) jsonError('Tipo de arquivo não permitido', 422);
    if ($f['size'] > 8 * 1024 * 1024)             jsonError('Arquivo maior que 8MB', 422);

    $sub  = preg_replace('/[^a-z0-9_]/i', '', $sub) ?: 'os';
    $base = rtrim(config()['uploads_dir'], '/');
    $dir  = $base . '/' . $sub;

    // Cria a pasta de uploads (e a subpasta). O 3º teste cobre corrida entre
    // processos. Se nem assim existir, o servidor não tem permissão de escrita.
    if (!is_dir($dir) && !@mkdir($dir, 0775, true) && !is_dir($dir)) {
        jsonError(detalheUpload('Não foi possível criar a pasta de uploads no servidor. Crie a pasta "uploads" e dê permissão de escrita ao servidor web.', $base), 500);
    }
    if (!is_writable($dir)) {
        jsonError(detalheUpload('A pasta de uploads existe, mas o servidor web não tem permissão para gravar nela.', $dir), 500);
    }

    $ext  = strtolower(preg_replace('/[^a-z0-9]/i', '', pathinfo($f['name'], PATHINFO_EXTENSION)) ?: 'bin');
    $nome = $sub . '_' . bin2hex(random_bytes(8)) . '.' . $ext;
    $dest = $dir . '/' . $nome;

    if (!move_uploaded_file($f['tmp_name'], $dest)) jsonError(detalheUpload('Falha ao salvar o arquivo enviado.', $dest), 500);
    @chmod($dest, 0644); // garante que o servidor web consiga LER/servir a imagem

    return rtrim(config()['app_base_url'], '/') . '/uploads/' . $sub . '/' . $nome;
}

// Anexa o caminho real do servidor à mensagem só quando 'debug' está ligado
// (em produção a mensagem fica genérica, sem expor caminhos do servidor).
function detalheUpload(string $msg, string $path): string {
    return !empty(config()['debug']) ? $msg . ' [' . $path . ']' : $msg;
}

// Traduz o código de erro de upload do PHP ($_FILES[...]['error']) numa mensagem clara.
function mensagemErroUpload(int $code): string {
    switch ($code) {
        case UPLOAD_ERR_INI_SIZE:
        case UPLOAD_ERR_FORM_SIZE:
            return 'A imagem é grande demais (passou do limite do servidor). Use uma imagem menor ou aumente "upload_max_filesize"/"post_max_size" no php.ini.';
        case UPLOAD_ERR_PARTIAL:
            return 'O envio da imagem foi interrompido. Tente novamente.';
        case UPLOAD_ERR_NO_TMP_DIR:
            return 'O servidor está sem pasta temporária para uploads ("upload_tmp_dir" do php.ini).';
        case UPLOAD_ERR_CANT_WRITE:
            return 'O servidor não conseguiu gravar o arquivo temporário do upload (permissão).';
        case UPLOAD_ERR_EXTENSION:
            return 'Uma extensão do PHP bloqueou o upload.';
        default:
            return 'Falha no envio da imagem (código ' . $code . ').';
    }
}
