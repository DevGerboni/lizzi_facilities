<?php
// os/os_pdf.php — versão imprimível da OS (HTML pronto para "imprimir como PDF").
// GET ?id=
// Obs.: sem lib de PDF (dompdf/tcpdf) por ora. "Forma de pagamento" e "assinaturas"
// dependem de D8/D10 — incluído o total de materiais (que já existe).
require_once __DIR__ . '/../core/db.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../core/auth.php';
require_once __DIR__ . '/../core/util.php';

corsPreflight();
[$pdo, $user] = contextoEmpresa();
$id = (int)($_GET['id'] ?? 0);
if (!$id) jsonError('Informe o id', 422);

$st = $pdo->prepare(
    "SELECT os.*, u.nome AS unidade_nome, p.nome AS piso_nome, l.nome AS local_nome
       FROM ordens_servico os
       LEFT JOIN unidades u ON u.id = os.unidade_id
       LEFT JOIN pisos    p ON p.id = os.piso_id
       LEFT JOIN locais   l ON l.id = os.local_id
      WHERE os.id = :id AND os.deleted_at IS NULL");
$st->execute([':id' => $id]);
$os = $st->fetch();
if (!$os) jsonError('OS não encontrada', 404);

$cfg = $pdo->query("SELECT * FROM configuracoes_empresa LIMIT 1")->fetch() ?: [];
$nomes = nomesDeUsuarios([$os['tecnico_id'], $os['solicitante_id']]);
$tec = $os['tecnico_id'] ? ($nomes[(int)$os['tecnico_id']]['nome'] ?? '') : '';
$sol = $os['solicitante_id'] ? ($nomes[(int)$os['solicitante_id']]['nome'] ?? '') : '';

$mat = $pdo->prepare(
    "SELECT m.nome, mm.quantidade, mm.valor_unitario, mm.valor_total
       FROM materiais_movimentacoes mm JOIN materiais m ON m.id = mm.material_id
      WHERE mm.ordem_servico_id = :id AND mm.tipo = 'saida' ORDER BY mm.created_at");
$mat->execute([':id' => $id]);
$itens = $mat->fetchAll();
$total = 0;
foreach ($itens as $it) $total += (float)$it['valor_total'];

// URL pública do logo a partir de ONDE este script roda (robusto ao app_base_url /
// pasta aninhada no servidor). Vazio se não houver logo.
function urlLogo(?string $u): string {
    if (!$u) return '';
    $i = strpos($u, '/uploads/');
    $tail = $i !== false ? substr($u, $i) : '/' . ltrim($u, '/');
    $scheme = (!empty($_SERVER['HTTPS']) && strtolower((string)$_SERVER['HTTPS']) !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? '';
    $dir  = rtrim(str_replace('\\', '/', dirname((string)($_SERVER['SCRIPT_NAME'] ?? '/'))), '/'); // .../os
    $appBase = preg_replace('#/os$#', '', $dir); // remove /os → base pública do app
    return $scheme . '://' . $host . $appBase . $tail;
}

$h = fn($v) => htmlspecialchars((string)$v, ENT_QUOTES, 'UTF-8');
$cor = $h($cfg['cor_primaria'] ?? '#1E66F5');
$logo = urlLogo($cfg['logo_url'] ?? '');
$assinaturaTecnico = urlLogo($os['assinatura_tecnico_url'] ?? '');
$assinaturaCliente = urlLogo($os['assinatura_cliente_url'] ?? '');

$rotStatus = ['aberto'=>'Atribuído','em_andamento'=>'Em execução','interrompido'=>'Interrompido','aguardando_aprovacao'=>'Aguardando aprovação do cliente','concluido'=>'Concluído','cancelado'=>'Cancelado'];
$rotTipo   = ['corretiva'=>'Corretiva','preventiva'=>'Preventiva'];
$rotPrio   = ['baixa'=>'Baixa','media'=>'Média','alta'=>'Alta','urgente'=>'Urgente'];
$lbl = fn($map, $v) => $map[$v] ?? ($v !== null && $v !== '' ? $v : '-');
$hhmm = function ($v) {
    if ($v === null || $v === '' || !is_numeric($v)) return '-';
    $min = max(0, (int)round((float)$v));
    return str_pad((string)intdiv($min, 60), 2, '0', STR_PAD_LEFT) . ':' . str_pad((string)($min % 60), 2, '0', STR_PAD_LEFT);
};

// devolve HTML (não JSON)
cors();
header('Content-Type: text/html; charset=utf-8');
?>
<!doctype html><html lang="pt-br"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>OS <?= $h($os['codigo']) ?> · <?= $h($cfg['nome_fantasia'] ?? 'Empresa') ?></title>
<style>
  :root{ --cor: <?= $cor ?>; }
  *{box-sizing:border-box}
  body{font-family:'Segoe UI',Arial,Helvetica,sans-serif;color:#1f2937;margin:0;background:#f3f4f6;font-size:13px;line-height:1.5;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .folha{max-width:820px;margin:24px auto;background:#fff;padding:34px 38px;box-shadow:0 1px 8px rgba(0,0,0,.10)}
  .cab{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;border-bottom:2px solid var(--cor);padding-bottom:16px}
  .empresa{display:flex;gap:14px;align-items:center}
  .logo{height:58px;width:auto;max-width:170px;object-fit:contain}
  .cab h1{font-size:17px;margin:0 0 3px;color:#111827}
  .contato{color:#6b7280;font-size:11.5px}
  .doc{text-align:right;white-space:nowrap}
  .doc .rotulo{font-size:11px;letter-spacing:.14em;color:#9ca3af;text-transform:uppercase}
  .doc .cod{font-size:21px;font-weight:700;color:var(--cor);line-height:1.1}
  .status{display:inline-block;margin-top:6px;background:var(--cor);color:#fff;padding:3px 12px;border-radius:999px;font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:.05em}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 28px;margin-top:18px}
  .campo .k{color:#6b7280;font-size:10.5px;text-transform:uppercase;letter-spacing:.05em;display:block}
  .campo .v{font-weight:600;color:#111827}
  h2{font-size:11.5px;text-transform:uppercase;letter-spacing:.09em;color:var(--cor);margin:24px 0 8px;border-bottom:1px solid #e5e7eb;padding-bottom:5px}
  .bloco{white-space:pre-wrap}
  table{width:100%;border-collapse:collapse;margin-top:4px;font-size:12.5px}
  th,td{padding:8px 10px;text-align:left}
  thead th{background:var(--cor);color:#fff;font-weight:600;font-size:10.5px;text-transform:uppercase;letter-spacing:.04em}
  tbody tr:nth-child(even){background:#f9fafb}
  tbody td{border-bottom:1px solid #eef0f3}
  .num{text-align:right;white-space:nowrap}
  .total-row td{font-weight:700;border-top:2px solid var(--cor);background:#fff;font-size:13.5px}
  .assin{display:flex;gap:48px;margin-top:44px}
  .assin div{flex:1;border-top:1px solid #9ca3af;text-align:center;padding-top:6px;color:#6b7280;font-size:12px;min-height:86px}
  .assin img{display:block;max-width:100%;height:62px;object-fit:contain;margin:0 auto 6px}
  .rodape{margin-top:30px;border-top:1px solid #e5e7eb;padding-top:8px;color:#9ca3af;font-size:10.5px;text-align:center}
  .barra{background:#111827;padding:10px;text-align:center}
  .barra button{background:var(--cor);color:#fff;border:0;padding:9px 22px;border-radius:6px;font-size:13px;cursor:pointer;font-weight:600}
  @media print{ body{background:#fff} .folha{box-shadow:none;margin:0;max-width:none;padding:0} .noprint{display:none} }
</style></head><body>
<div class="barra noprint"><button onclick="window.print()">🖨️ Imprimir / Salvar PDF</button></div>
<div class="folha">
  <div class="cab">
    <div class="empresa">
      <?php if ($logo): ?><img class="logo" src="<?= $h($logo) ?>" alt=""><?php endif; ?>
      <div>
        <h1><?= $h($cfg['nome_fantasia'] ?? 'Empresa') ?></h1>
        <?php if (!empty($cfg['endereco'])): ?><div class="contato"><?= $h($cfg['endereco']) ?></div><?php endif; ?>
        <div class="contato">
          <?php
            $ct = array_filter([
              !empty($cfg['telefone']) ? 'Tel: ' . $h($cfg['telefone']) : '',
              !empty($cfg['whatsapp']) ? 'WhatsApp: ' . $h($cfg['whatsapp']) : '',
              !empty($cfg['email']) ? $h($cfg['email']) : '',
            ]);
            echo implode(' · ', $ct);
          ?>
        </div>
      </div>
    </div>
    <div class="doc">
      <div class="rotulo">Ordem de Serviço</div>
      <div class="cod"><?= $h($os['codigo']) ?></div>
      <div class="status"><?= $h($lbl($rotStatus, $os['status'])) ?></div>
    </div>
  </div>

  <div class="grid">
    <div class="campo"><span class="k">Tipo</span><span class="v"><?= $h($lbl($rotTipo, $os['tipo_os'])) ?></span></div>
    <div class="campo"><span class="k">Prioridade</span><span class="v"><?= $h($lbl($rotPrio, $os['prioridade'])) ?></span></div>
    <div class="campo"><span class="k">Local</span><span class="v"><?= $h(implode(' / ', array_filter([$os['unidade_nome'], $os['piso_nome'], $os['local_nome']]))) ?: '-' ?></span></div>
    <div class="campo"><span class="k">Agendada</span><span class="v"><?= $h(trim(($os['data_agendada'] ?? '') . ' ' . ($os['hora_agendada'] ?? ''))) ?: '-' ?></span></div>
    <div class="campo"><span class="k">Solicitante</span><span class="v"><?= $h($sol ?: '-') ?></span></div>
    <div class="campo"><span class="k">Técnico</span><span class="v"><?= $h($tec ?: '-') ?></span></div>
    <div class="campo"><span class="k">Tempo de execução</span><span class="v"><?= $h($hhmm($os['tempo_total_minutos'] ?? null)) ?></span></div>
  </div>

  <?php if (!empty($os['avaria']) || !empty($os['descricao']) || !empty($os['observacao'])): ?>
  <h2>Descrição do serviço</h2>
  <?php if (!empty($os['avaria'])): ?><div class="campo"><span class="k">Avaria</span><div class="bloco"><?= $h($os['avaria']) ?></div></div><?php endif; ?>
  <?php if (!empty($os['descricao'])): ?><div class="campo" style="margin-top:8px"><span class="k">Descrição</span><div class="bloco"><?= $h($os['descricao']) ?></div></div><?php endif; ?>
  <?php if (!empty($os['observacao'])): ?><div class="campo" style="margin-top:8px"><span class="k">Observação</span><div class="bloco"><?= $h($os['observacao']) ?></div></div><?php endif; ?>
  <?php endif; ?>

  <h2>Materiais utilizados</h2>
  <table>
    <thead><tr><th>Item</th><th class="num">Qtd</th><th class="num">Valor unit.</th><th class="num">Total</th></tr></thead>
    <tbody>
      <?php foreach ($itens as $it): ?>
      <tr>
        <td><?= $h($it['nome']) ?></td>
        <td class="num"><?= $h($it['quantidade']) ?></td>
        <td class="num">R$ <?= number_format((float)$it['valor_unitario'], 2, ',', '.') ?></td>
        <td class="num">R$ <?= number_format((float)$it['valor_total'], 2, ',', '.') ?></td>
      </tr>
      <?php endforeach; ?>
      <?php if (!$itens): ?><tr><td colspan="4" style="color:#9ca3af">Nenhum material utilizado.</td></tr><?php endif; ?>
      <tr class="total-row"><td colspan="3" class="num">Total</td><td class="num">R$ <?= number_format($total, 2, ',', '.') ?></td></tr>
    </tbody>
  </table>

  <div class="assin">
    <div><?php if ($assinaturaTecnico): ?><img src="<?= $h($assinaturaTecnico) ?>" alt=""><?php endif; ?>Assinatura do técnico<?= $tec ? '<br>' . $h($tec) : '' ?></div>
    <div><?php if ($assinaturaCliente): ?><img src="<?= $h($assinaturaCliente) ?>" alt=""><?php endif; ?>Assinatura do cliente<?= $sol ? '<br>' . $h($sol) : '' ?></div>
  </div>

  <div class="rodape">
    <?= $h($cfg['nome_fantasia'] ?? '') ?> · OS <?= $h($os['codigo']) ?> · Documento gerado pelo sistema Lizzi Facilities
  </div>
</div>
</body></html>
