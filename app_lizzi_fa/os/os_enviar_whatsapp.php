<?php
// os/os_enviar_whatsapp.php — envia a OS por WhatsApp via N8N + Evolution API.
// POST { ordem_servico_id, tipo: 'tecnico'|'cliente', to? }
// Número de ORIGEM e instância vêm de configuracoes_empresa (por empresa).
require_once __DIR__ . '/../core/db.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../core/auth.php';
require_once __DIR__ . '/../core/util.php';
require_once __DIR__ . '/../core/whatsapp.php';
require_once __DIR__ . '/../core/log.php';

corsPreflight();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') jsonError('Método não permitido', 405);
[$pdo, $user] = contextoEmpresa();
$b = bodyJson();

$osId = (int)($b['ordem_servico_id'] ?? 0);
$tipo = $b['tipo'] ?? '';
if (!$osId)                                   jsonError('Informe a OS.', 422);
if (!in_array($tipo, ['tecnico', 'cliente'], true)) jsonError("Tipo deve ser 'técnico' ou 'cliente'.", 422);

// OS + estrutura
$st = $pdo->prepare(
    "SELECT os.*, u.nome AS unidade_nome, p.nome AS piso_nome, l.nome AS local_nome
       FROM ordens_servico os
       LEFT JOIN unidades u ON u.id = os.unidade_id
       LEFT JOIN pisos    p ON p.id = os.piso_id
       LEFT JOIN locais   l ON l.id = os.local_id
      WHERE os.id = :id AND os.deleted_at IS NULL");
$st->execute([':id' => $osId]);
$os = $st->fetch();
if (!$os) jsonError('OS não encontrada', 404);

// config de WhatsApp da empresa (instância/numero de origem)
$cfg = $pdo->query("SELECT whatsapp_numero, whatsapp_instancia, whatsapp_ativo, nome_fantasia FROM configuracoes_empresa LIMIT 1")->fetch();
if (!$cfg || !$cfg['whatsapp_ativo']) jsonError('WhatsApp não está ativo para esta empresa.', 409);

// destinatário
$to = $b['to'] ?? '';
if ($to === '') {
    if ($tipo === 'tecnico' && $os['tecnico_id']) {
        $t = usuarioCentral((int)$os['tecnico_id']);
        $to = $t['whatsapp'] ?? '';
    } elseif ($tipo === 'cliente' && $os['solicitante_id']) {
        $s = usuarioCentral((int)$os['solicitante_id']);
        $to = $s['whatsapp'] ?? '';
    }
}
if ($to === '') jsonError('Destinatário sem número de WhatsApp (informe "to")', 422);

// mensagem com as infos da OS
$msg = "*OS {$os['codigo']}* ({$os['tipo_os']} / {$os['prioridade']})\n"
     . ($cfg['nome_fantasia'] ? "Empresa: {$cfg['nome_fantasia']}\n" : '')
     . "Local: {$os['unidade_nome']} / {$os['piso_nome']} / {$os['local_nome']}\n"
     . ($os['avaria'] ? "Avaria: {$os['avaria']}\n" : '')
     . ($os['descricao'] ? "Descrição: {$os['descricao']}\n" : '')
     . ($os['data_agendada'] ? "Agendada: {$os['data_agendada']} {$os['hora_agendada']}\n" : '')
     . "Status: {$os['status']}";

[$ok, $info] = enviarWhatsappN8N([
    'empresa_id'         => (int)$user['empresa_id'],
    'whatsapp_instancia' => $cfg['whatsapp_instancia'],
    'from'               => $cfg['whatsapp_numero'],
    'to'                 => $to,
    'tipo'               => $tipo,
    'ordem_servico_id'   => $osId,
    'mensagem'           => $msg,
]);

registrarLog($pdo, $user['id'], 'ordens_servico', $osId, 'alterar', null, ['whatsapp' => $tipo, 'to' => $to, 'ok' => $ok]);

if (!$ok) jsonError('Falha ao enviar via N8N: ' . $info, 502);
jsonResponse(['enviado' => true, 'to' => $to], true, 'WhatsApp enviado');
