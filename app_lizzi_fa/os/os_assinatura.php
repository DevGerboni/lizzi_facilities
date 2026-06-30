<?php
// os/os_assinatura.php - salva assinatura do técnico ou cliente na OS.
// POST multipart: ordem_servico_id, tipo=tecnico|cliente, assinatura=<imagem>
require_once __DIR__ . '/../core/db.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../core/auth.php';
require_once __DIR__ . '/../core/crud.php';
require_once __DIR__ . '/../core/upload.php';
require_once __DIR__ . '/../core/log.php';

corsPreflight();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonError('Método não permitido', 405);

[$pdo, $user] = contextoEmpresa();

$osId = (int)($_POST['ordem_servico_id'] ?? 0);
$tipo = $_POST['tipo'] ?? '';
if (!$osId) jsonError('Informe a OS.', 422);
if (!in_array($tipo, ['tecnico', 'cliente'], true)) jsonError('Tipo de assinatura inválido.', 422);
if (!existe($pdo, 'ordens_servico', $osId)) jsonError('OS não encontrada.', 404);
if (osEncerrada($pdo, $osId)) jsonError('OS encerrada — não é possível alterar assinaturas.', 409);

$url = salvarUpload('assinatura', 'assinaturas');
if (!$url) jsonError('Envie a imagem no campo "assinatura".', 422);

$campo = $tipo === 'tecnico' ? 'assinatura_tecnico_url' : 'assinatura_cliente_url';
$st = $pdo->prepare("UPDATE ordens_servico SET {$campo} = :url WHERE id = :id AND deleted_at IS NULL");
$st->execute([':url' => $url, ':id' => $osId]);

registrarLog($pdo, $user['id'], 'ordens_servico', $osId, 'alterar', null, [$campo => $url]);
jsonResponse([$campo => $url], true, 'Assinatura salva.', 201);
