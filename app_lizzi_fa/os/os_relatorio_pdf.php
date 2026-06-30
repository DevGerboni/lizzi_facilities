<?php
// os/os_relatorio_pdf.php — RELATÓRIO COMPLETO em HTML (imprimir / salvar PDF).
// Para CADA OS do filtro, em seções: Dados · Materiais · Checklist (completo) ·
// Imagens (fotos embutidas) · Assinaturas (imagens) · Histórico.
// GET &de= &ate= &status= &unidade_id= &tecnico_id=
require_once __DIR__ . '/../core/db.php';
require_once __DIR__ . '/../core/response.php';
require_once __DIR__ . '/../core/auth.php';
require_once __DIR__ . '/../core/util.php';

corsPreflight();
[$pdo, $user] = contextoEmpresa();
exigirPerfil($user, ['admin_geral', 'admin_empresa', 'supervisor']);

// URL pública de um arquivo em /uploads a partir de ONDE este script roda
// (robusto ao app_base_url / pasta aninhada no servidor).
function urlPub(?string $u): string {
    if (!$u) return '';
    $i = strpos($u, '/uploads/');
    $tail = $i !== false ? substr($u, $i) : '/' . ltrim($u, '/');
    $scheme = (!empty($_SERVER['HTTPS']) && strtolower((string)$_SERVER['HTTPS']) !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'] ?? '';
    $dir  = rtrim(str_replace('\\', '/', dirname((string)($_SERVER['SCRIPT_NAME'] ?? '/'))), '/');
    return $scheme . '://' . $host . preg_replace('#/os$#', '', $dir) . $tail;
}

$where = ['os.deleted_at IS NULL']; $params = [];
if (!empty($_GET['de']))         { $where[] = 'os.created_at::date >= :de';  $params[':de'] = $_GET['de']; }
if (!empty($_GET['ate']))        { $where[] = 'os.created_at::date <= :ate'; $params[':ate'] = $_GET['ate']; }
if (!empty($_GET['unidade_id'])) { $where[] = 'os.unidade_id = :uid';        $params[':uid'] = (int)$_GET['unidade_id']; }
if (!empty($_GET['tecnico_id'])) { $where[] = 'os.tecnico_id = :tid';        $params[':tid'] = (int)$_GET['tecnico_id']; }
if (!empty($_GET['status']))     { $where[] = 'os.status = :st';             $params[':st'] = $_GET['status']; }
$cond = implode(' AND ', $where);

$oss = $pdo->prepare(
    "SELECT os.*, u.nome AS unidade_nome, p.nome AS piso_nome, l.nome AS local_nome, a.nome AS ativo_nome,
            CASE
                WHEN os.inicio_atendimento IS NULL THEN os.tempo_total_minutos
                WHEN os.status = 'em_andamento' THEN COALESCE(os.tempo_total_minutos, 0) +
                     CASE WHEN now() > os.inicio_atendimento
                          THEN GREATEST(1, CEIL(EXTRACT(EPOCH FROM (now() - os.inicio_atendimento)) / 60)::int)
                          ELSE 0 END
                WHEN os.tempo_total_minutos IS NOT NULL AND os.tempo_total_minutos > 0 THEN os.tempo_total_minutos
                ELSE CASE WHEN COALESCE(
                    os.fim_atendimento,
                    (SELECT h.created_at FROM os_historico h
                      WHERE h.ordem_servico_id = os.id AND h.status_novo = os.status
                      ORDER BY h.created_at DESC LIMIT 1),
                    os.updated_at
                ) >= os.inicio_atendimento
                THEN GREATEST(1, CEIL(EXTRACT(EPOCH FROM (
                    COALESCE(
                        os.fim_atendimento,
                        (SELECT h.created_at FROM os_historico h
                          WHERE h.ordem_servico_id = os.id AND h.status_novo = os.status
                          ORDER BY h.created_at DESC LIMIT 1),
                        os.updated_at
                    ) - os.inicio_atendimento
                )) / 60)::int)
                ELSE 0 END
            END AS tempo_total_calculado_minutos
       FROM ordens_servico os
       LEFT JOIN unidades u ON u.id = os.unidade_id
       LEFT JOIN pisos    p ON p.id = os.piso_id
       LEFT JOIN locais   l ON l.id = os.local_id
       LEFT JOIN ativos   a ON a.id = os.ativo_id
      WHERE $cond ORDER BY os.created_at DESC");
$oss->execute($params);
$lista = $oss->fetchAll();

$ids = [];
foreach ($lista as $o) { $ids[] = $o['tecnico_id']; $ids[] = $o['solicitante_id']; }
$nomes = nomesDeUsuarios($ids);

$cfg  = $pdo->query("SELECT * FROM configuracoes_empresa LIMIT 1")->fetch() ?: [];
$logo = urlPub($cfg['logo_url'] ?? '');

$stImg  = $pdo->prepare("SELECT imagem_url, tipo, created_at FROM os_imagens WHERE ordem_servico_id = :id ORDER BY created_at");
$stChk  = $pdo->prepare("SELECT cm.nome AS modelo, ci.descricao, r.marcado, r.observacao, r.imagem_url
                           FROM os_checklist_respostas r
                           JOIN checklist_itens ci ON ci.id = r.checklist_item_id
                           JOIN checklist_modelos cm ON cm.id = ci.checklist_modelo_id
                          WHERE r.ordem_servico_id = :id ORDER BY cm.nome, ci.ordem");
$stMat  = $pdo->prepare("SELECT m.nome, mm.quantidade, mm.valor_unitario, mm.valor_total
                           FROM materiais_movimentacoes mm JOIN materiais m ON m.id = mm.material_id
                          WHERE mm.ordem_servico_id = :id AND mm.tipo = 'saida' ORDER BY mm.created_at");
$stHist = $pdo->prepare("SELECT acao, status_anterior, status_novo, observacao, created_at
                           FROM os_historico WHERE ordem_servico_id = :id ORDER BY created_at");

$h   = fn($v) => htmlspecialchars((string)$v, ENT_QUOTES, 'UTF-8');
$cor = $h($cfg['cor_primaria'] ?? '#1E66F5');
$rotStatus = ['aberto'=>'Atribuído','em_andamento'=>'Em execução','interrompido'=>'Interrompido','aguardando_aprovacao'=>'Aguardando aprovação do cliente','concluido'=>'Concluído','cancelado'=>'Cancelado'];
$rotTipo = ['corretiva'=>'Corretiva','preventiva'=>'Preventiva'];
$lbl = fn($map, $v) => $map[$v] ?? ($v !== null && $v !== '' ? $v : '-');
$marc = fn($v) => ($v === true || $v === 't' || $v === 'true' || $v === '1') ? 'Sim' : 'Não';
$dt = function ($v) {
    if (!$v) return '-';
    try { $d = new DateTime((string)$v); $d->setTimezone(new DateTimeZone('America/Sao_Paulo')); return $d->format('d/m/Y H:i:s'); }
    catch (\Throwable $e) { return (string)$v; }
};
$qtd = fn($v) => rtrim(rtrim(number_format((float)$v, 3, ',', '.'), '0'), ',');
$money = fn($v) => 'R$ ' . number_format((float)$v, 2, ',', '.');
$hhmm = function ($v) {
    if ($v === null || $v === '' || !is_numeric($v)) return '-';
    $min = max(0, (int)round((float)$v));
    return str_pad((string)intdiv($min, 60), 2, '0', STR_PAD_LEFT) . ':' . str_pad((string)($min % 60), 2, '0', STR_PAD_LEFT);
};

cors();
header('Content-Type: text/html; charset=utf-8');
?>
<!doctype html><html lang="pt-br"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Relatório de chamados</title>
<style>
  :root{ --cor: <?= $cor ?>; }
  *{box-sizing:border-box}
  body{font-family:'Segoe UI',Arial,sans-serif;color:#1f2937;margin:0;background:#f3f4f6;font-size:12.5px;line-height:1.5;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .barra{background:#111827;text-align:center;padding:10px}
  .barra button{background:var(--cor);color:#fff;border:0;padding:9px 22px;border-radius:6px;font-weight:700;cursor:pointer}
  .capa{max-width:900px;margin:22px auto 0;background:#fff;border-radius:14px 14px 0 0;padding:24px 30px;display:flex;justify-content:space-between;align-items:center;gap:20px;border-bottom:3px solid var(--cor)}
  .capa .logo{height:54px;max-width:170px;object-fit:contain}
  .capa h1{margin:0;font-size:20px}
  .capa .meta{text-align:right;font-size:12px;color:#6b7280}
  .os{max-width:900px;margin:0 auto;background:#fff;padding:22px 30px 26px;border-bottom:8px solid #f3f4f6}
  .os-cab{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e5e7eb;padding-bottom:8px;margin-bottom:12px}
  .os-cab b{font-size:17px;color:var(--cor)}
  .pill{background:var(--cor);color:#fff;padding:3px 11px;border-radius:999px;font-size:10.5px;font-weight:700;text-transform:uppercase}
  h4{font-size:10.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--cor);margin:16px 0 6px;border-bottom:1px solid #eef0f3;padding-bottom:3px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:5px 22px}
  .k{color:#6b7280;font-size:10px;text-transform:uppercase}
  .v{font-weight:600}
  table{width:100%;border-collapse:collapse;font-size:11.5px;margin-top:2px}
  th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #eef0f3}
  th{background:#f3f6ff;color:#374151;font-size:10px;text-transform:uppercase}
  .imgs{display:flex;flex-wrap:wrap;gap:8px}
  .imgs figure{margin:0;width:150px}
  .imgs img{width:150px;height:115px;object-fit:cover;border-radius:8px;border:1px solid #e5e7eb;display:block}
  .imgs figcaption{font-size:10px;color:#6b7280;margin-top:2px;text-align:center}
  .assin{display:flex;gap:30px;flex-wrap:wrap}
  .assin div{flex:1;min-width:200px;text-align:center}
  .assin img{max-height:90px;max-width:100%;border-bottom:1px solid #9ca3af}
  .vazio{color:#9ca3af}
  .chk{margin:4px 0;padding-left:18px}
  .chk li{margin:3px 0}
  @media print{ body{background:#fff} .noprint{display:none} .capa,.os{max-width:none;margin:0;border-radius:0} .os{break-after:page} .os:last-child{break-after:auto} }
</style></head><body>
<div class="barra noprint"><button onclick="window.print()">🖨️ Imprimir / Salvar PDF</button></div>
<div class="capa">
  <div style="display:flex;align-items:center;gap:14px">
    <?php if ($logo): ?><img class="logo" src="<?= $h($logo) ?>" alt=""><?php endif; ?>
    <div><h1>Relatório de chamados</h1><div style="color:#6b7280"><?= $h($cfg['nome_fantasia'] ?? 'Empresa') ?></div></div>
  </div>
  <div class="meta">
    <div><b><?= count($lista) ?></b> chamado(s)</div>
    <div>Período: <?= $h($_GET['de'] ?? 'início') ?> &rarr; <?= $h($_GET['ate'] ?? 'hoje') ?></div>
    <div>Gerado em <?= $dt(date('c')) ?></div>
  </div>
</div>

<?php if (!$lista): ?>
  <div class="os"><p class="vazio">Nenhum chamado encontrado para o filtro selecionado.</p></div>
<?php endif; ?>

<?php foreach ($lista as $o):
    $tec = $o['tecnico_id'] ? ($nomes[(int)$o['tecnico_id']]['nome'] ?? '') : '';
    $sol = $o['solicitante_id'] ? ($nomes[(int)$o['solicitante_id']]['nome'] ?? '') : '';
    $stImg->execute([':id' => $o['id']]);  $imgs = $stImg->fetchAll();
    $stChk->execute([':id' => $o['id']]);  $chks = $stChk->fetchAll();
    $stMat->execute([':id' => $o['id']]);  $mats = $stMat->fetchAll();
    $stHist->execute([':id' => $o['id']]); $hist = $stHist->fetchAll();
    $local = implode(' / ', array_filter([$o['unidade_nome'], $o['piso_nome'], $o['local_nome']]));
    $ag = $o['data_agendada'] ? $dt($o['data_agendada'] . ' ' . ($o['hora_agendada'] ?: '00:00')) : '-';
    $assTec = urlPub($o['assinatura_tecnico_url'] ?? '');
    $assCli = urlPub($o['assinatura_cliente_url'] ?? '');
?>
<section class="os">
  <div class="os-cab"><b>OS <?= $h($o['codigo']) ?></b><span class="pill"><?= $h($lbl($rotStatus, $o['status'])) ?></span></div>

  <h4>Dados</h4>
  <div class="grid">
    <div><span class="k">Tipo</span> <span class="v"><?= $h($lbl($rotTipo, $o['tipo_os'])) ?></span></div>
    <div><span class="k">Prioridade</span> <span class="v"><?= $h(ucfirst((string)$o['prioridade'])) ?></span></div>
    <div><span class="k">Local</span> <span class="v"><?= $h($local ?: '-') ?></span></div>
    <div><span class="k">Equipamento</span> <span class="v"><?= $h($o['ativo_nome'] ?: '-') ?></span></div>
    <div><span class="k">Solicitante</span> <span class="v"><?= $h($sol ?: '-') ?></span></div>
    <div><span class="k">Técnico</span> <span class="v"><?= $h($tec ?: '-') ?></span></div>
    <div><span class="k">Atribuído</span> <span class="v"><?= $dt($o['created_at']) ?></span></div>
    <div><span class="k">Agendada</span> <span class="v"><?= $h($ag) ?></span></div>
    <div><span class="k">Início</span> <span class="v"><?= $dt($o['inicio_atendimento']) ?></span></div>
    <div><span class="k">Fim</span> <span class="v"><?= $dt($o['fim_atendimento']) ?></span></div>
    <div><span class="k">Tempo de execução</span> <span class="v"><?= $h($hhmm($o['tempo_total_calculado_minutos'] ?? null)) ?></span></div>
  </div>
  <?php if ($o['avaria'] || $o['descricao'] || $o['observacao']): ?>
    <div style="margin-top:8px">
      <?php if ($o['avaria']): ?><div><span class="k">Avaria</span> <?= $h($o['avaria']) ?></div><?php endif; ?>
      <?php if ($o['descricao']): ?><div><span class="k">Descrição</span> <?= $h($o['descricao']) ?></div><?php endif; ?>
      <?php if ($o['observacao']): ?><div><span class="k">Observação</span> <?= $h($o['observacao']) ?></div><?php endif; ?>
    </div>
  <?php endif; ?>

  <h4>Materiais</h4>
  <?php if ($mats): ?>
    <table><thead><tr><th>Material</th><th>Qtd</th><th>Valor unit.</th><th>Total</th></tr></thead><tbody>
    <?php $tot = 0; foreach ($mats as $m): $tot += (float)$m['valor_total']; ?>
      <tr><td><?= $h($m['nome']) ?></td><td><?= $h($qtd($m['quantidade'])) ?></td><td><?= $money($m['valor_unitario']) ?></td><td><?= $money($m['valor_total']) ?></td></tr>
    <?php endforeach; ?>
      <tr><th colspan="3" style="text-align:right">Total</th><th><?= $money($tot) ?></th></tr>
    </tbody></table>
  <?php else: ?><p class="vazio">Nenhum material utilizado.</p><?php endif; ?>

  <h4>Checklist</h4>
  <?php if ($chks): ?>
    <ul class="chk">
    <?php foreach ($chks as $c): ?>
      <li><b><?= $marc($c['marcado']) === 'Sim' ? '&#9745;' : '&#9744;' ?></b> <?= $h($c['descricao']) ?>
        <?php if ($c['observacao']): ?> &mdash; <i><?= $h($c['observacao']) ?></i><?php endif; ?>
        <?php if ($c['imagem_url']): ?><div style="margin-top:4px"><img src="<?= $h(urlPub($c['imagem_url'])) ?>" alt="" style="max-height:110px;border-radius:6px;border:1px solid #e5e7eb"></div><?php endif; ?>
        <small style="color:#9ca3af">(<?= $h($c['modelo']) ?>)</small>
      </li>
    <?php endforeach; ?>
    </ul>
  <?php else: ?><p class="vazio">Sem checklist respondido.</p><?php endif; ?>

  <h4>Imagens</h4>
  <?php if ($imgs): ?>
    <div class="imgs">
    <?php foreach ($imgs as $im): ?>
      <figure><img src="<?= $h(urlPub($im['imagem_url'])) ?>" alt=""><figcaption><?= $h($im['tipo']) ?></figcaption></figure>
    <?php endforeach; ?>
    </div>
  <?php else: ?><p class="vazio">Nenhuma imagem anexada.</p><?php endif; ?>

  <h4>Assinaturas</h4>
  <div class="assin">
    <div><?php if ($assTec): ?><img src="<?= $h($assTec) ?>" alt=""><?php endif; ?><div>Técnico<?= $tec ? ' &mdash; ' . $h($tec) : '' ?></div></div>
    <div><?php if ($assCli): ?><img src="<?= $h($assCli) ?>" alt=""><?php endif; ?><div>Cliente<?= $sol ? ' &mdash; ' . $h($sol) : '' ?></div></div>
  </div>

  <h4>Histórico</h4>
  <?php if ($hist): ?>
    <table><thead><tr><th>Quando</th><th>Ação</th><th>De / Para</th><th>Obs.</th></tr></thead><tbody>
    <?php foreach ($hist as $hh): ?>
      <tr><td><?= $dt($hh['created_at']) ?></td><td><?= $h($hh['acao']) ?></td>
          <td><?= $h($hh['status_anterior'] ? $lbl($rotStatus, $hh['status_anterior']) : '-') ?> / <?= $h($hh['status_novo'] ? $lbl($rotStatus, $hh['status_novo']) : '-') ?></td>
          <td><?= $h($hh['observacao'] ?: '-') ?></td></tr>
    <?php endforeach; ?>
    </tbody></table>
  <?php else: ?><p class="vazio">Sem histórico.</p><?php endif; ?>
</section>
<?php endforeach; ?>
</body></html>
