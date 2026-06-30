<?php
// ativos/foto.php - upload de foto do ativo (Premium).
// POST multipart { id, foto } -> atualiza ativos.foto_url.
require_once __DIR__ . '/../core/db.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../core/auth.php';
require_once __DIR__ . '/../core/crud.php';
require_once __DIR__ . '/../core/upload.php';
require_once __DIR__ . '/../core/log.php';

corsPreflight();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonError('Método não permitido', 405);

[$pdo, $user] = contextoEmpresa();
exigirPremium($user);
exigirPerfil($user, ['admin_geral', 'admin_empresa', 'supervisor']);

$id = (int)($_POST['id'] ?? $_POST['ativo_id'] ?? 0);
if (!$id) jsonError('Informe o id do ativo', 422);
if (!existe($pdo, 'ativos', $id)) jsonError('Ativo não encontrado', 404);

$url = salvarUpload('foto', 'ativos');
if (!$url) jsonError('Envie a imagem no campo "foto"', 422);

atualizar($pdo, 'ativos', $id, ['foto_url' => $url]);
registrarLog($pdo, $user['id'], 'ativos', $id, 'alterar', null, ['foto_url' => $url]);

jsonResponse(['id' => $id, 'foto_url' => $url], true, 'Foto do ativo atualizada');
