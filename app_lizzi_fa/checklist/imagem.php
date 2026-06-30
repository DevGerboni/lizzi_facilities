<?php
// checklist/imagem.php - upload de imagem usada em resposta de checklist.
// POST multipart (campo 'imagem') -> { imagem_url }
require_once __DIR__ . '/../core/db.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../core/auth.php';
require_once __DIR__ . '/../core/upload.php';

corsPreflight();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonError('Método não permitido', 405);

[$pdo, $user] = contextoEmpresa();
exigirPremium($user);

$url = salvarUpload('imagem', 'checklist');
if (!$url) jsonError('Envie a imagem no campo "imagem"', 422);

jsonResponse(['imagem_url' => $url], true, 'Imagem enviada', 201);
