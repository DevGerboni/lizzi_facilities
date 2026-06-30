<?php
// config_empresa/configuracoes.php — dados visuais + WhatsApp da empresa (1 linha).
// GET -> retorna a configuração | PUT -> atualiza (admin_geral/admin_empresa)
require_once __DIR__ . '/../core/db.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../core/auth.php';
require_once __DIR__ . '/../core/crud.php';
require_once __DIR__ . '/../core/log.php';

corsPreflight();
[$pdo, $user] = contextoEmpresa();
$metodo = $_SERVER['REQUEST_METHOD'];

// garante que existe 1 linha
$cfg = $pdo->query("SELECT * FROM configuracoes_empresa ORDER BY id LIMIT 1")->fetch();
if (!$cfg) {
    $novoId = inserir($pdo, 'configuracoes_empresa', ['cor_primaria' => '#1E66F5', 'cor_secundaria' => '#FFFFFF', 'whatsapp_ativo' => 'false']);
    $cfg = $pdo->query("SELECT * FROM configuracoes_empresa WHERE id = $novoId")->fetch();
}

if ($metodo === 'GET') {
    jsonResponse($cfg);
}

if ($metodo === 'PUT') {
    exigirPerfil($user, ['admin_geral', 'admin_empresa', 'supervisor']);
    $b = bodyJson();
    $campos = ['nome_fantasia','razao_social','documento','endereco','telefone','whatsapp','email',
               'logo_url','cor_primaria','cor_secundaria','whatsapp_numero','whatsapp_instancia'];
    $dados = camposInformados($b, $campos);
    if (array_key_exists('whatsapp_ativo', $b)) $dados['whatsapp_ativo'] = $b['whatsapp_ativo'] ? 'true' : 'false';
    if (!$dados) jsonError('Nada para atualizar', 422);

    $sets = implode(', ', array_map(fn($c) => "$c = :$c", array_keys($dados)));
    $st = $pdo->prepare("UPDATE configuracoes_empresa SET $sets WHERE id = :id");
    foreach ($dados as $k => $v) $st->bindValue(":$k", $v);
    $st->bindValue(':id', (int)$cfg['id'], PDO::PARAM_INT);
    $st->execute();

    registrarLog($pdo, $user['id'], 'configuracoes_empresa', (int)$cfg['id'], 'alterar', null, $dados);
    jsonResponse(['id' => (int)$cfg['id']], true, 'Configuração atualizada');
}

jsonError('Método não permitido', 405);
