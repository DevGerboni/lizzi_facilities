<?php
// os/os_imagens.php — imagens da OS.
// GET  ?ordem_servico_id=         -> lista
// POST multipart (campo 'imagem') { ordem_servico_id, tipo } -> faz upload e anexa
require_once __DIR__ . '/../core/db.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../core/auth.php';
require_once __DIR__ . '/../core/crud.php';
require_once __DIR__ . '/../core/upload.php';
require_once __DIR__ . '/../core/log.php';

corsPreflight();
[$pdo, $user] = contextoEmpresa();
$metodo = $_SERVER['REQUEST_METHOD'];

if ($metodo === 'GET') {
    $osId = (int)($_GET['ordem_servico_id'] ?? 0);
    if (!$osId) jsonError('Informe a OS.', 422);
    $st = $pdo->prepare("SELECT id, imagem_url, tipo, created_at FROM os_imagens WHERE ordem_servico_id = :id ORDER BY created_at");
    $st->execute([':id' => $osId]);
    jsonResponse($st->fetchAll());
}

if ($metodo === 'POST') {
    $osId = (int)($_POST['ordem_servico_id'] ?? 0);
    $tipo = $_POST['tipo'] ?? 'execucao';
    if (!$osId)                                              jsonError('Informe a OS.', 422);
    if (!in_array($tipo, ['abertura', 'execucao', 'conclusao'], true)) jsonError('tipo inválido', 422);
    if (!existe($pdo, 'ordens_servico', $osId))             jsonError('OS não encontrada', 404);
    if (osEncerrada($pdo, $osId))                           jsonError('OS encerrada — não é possível anexar imagens.', 409);

    $url = salvarUpload('imagem', 'os');
    if (!$url) jsonError('Envie o arquivo no campo "imagem"', 422);

    $id = inserir($pdo, 'os_imagens', ['ordem_servico_id' => $osId, 'imagem_url' => $url, 'tipo' => $tipo]);
    registrarLog($pdo, $user['id'], 'os_imagens', $id, 'criar', null, ['ordem_servico_id' => $osId, 'tipo' => $tipo]);
    jsonResponse(['id' => $id, 'imagem_url' => $url], true, 'Imagem anexada', 201);
}

if ($metodo === 'DELETE') {
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) jsonError('Informe o id da imagem', 422);
    $st = $pdo->prepare("SELECT imagem_url, ordem_servico_id FROM os_imagens WHERE id = :id");
    $st->execute([':id' => $id]);
    $row = $st->fetch();
    if (!$row) jsonError('Imagem não encontrada', 404);
    if (osEncerrada($pdo, (int)$row['ordem_servico_id'])) jsonError('OS encerrada — não é possível excluir imagens.', 409);

    $pdo->prepare("DELETE FROM os_imagens WHERE id = :id")->execute([':id' => $id]);

    // apaga o arquivo físico (best-effort: não trava se já não existir)
    $i = strpos((string)$row['imagem_url'], '/uploads/');
    if ($i !== false) {
        $path = rtrim(config()['uploads_dir'], '/') . substr($row['imagem_url'], $i + strlen('/uploads'));
        if (is_file($path)) @unlink($path);
    }
    registrarLog($pdo, $user['id'], 'os_imagens', $id, 'excluir');
    jsonResponse(['id' => $id], true, 'Imagem excluída');
}

jsonError('Método não permitido', 405);
