import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { WHATSAPP_CONTATO } from '../config';
import WhatsappFlutuante from '../components/WhatsappFlutuante';
import Contador from '../components/Contador';
import Icone from '../components/Icones';
import Logo from '../components/Logo';
import { useScrollReveal } from '../lib/useReveal';

const JORNADA: [string, string, string][] = [
  ['prancheta', 'Registra', 'Chamado com unidade, piso, local, prioridade, fotos e responsável.'],
  ['calendario', 'Agenda', 'Atribuição por técnico, data, hora e histórico desde a abertura.'],
  ['checklist', 'Executa', 'Status, checklist, fotos, materiais usados e tempo automático.'],
  ['grafico', 'Acompanha', 'Visão da operação por unidade, técnico, status e tempo médio.'],
];

const SIMPLES: [string, string, string][] = [
  ['chave', 'OS sem atrito', 'Chamados, status, histórico e evidências em poucos cliques.'],
  ['predio', 'Unidade, piso e local', 'Organização física pronta para condomínios, varejo, saúde e indústria.'],
  ['tecnico', 'Equipe e permissões', 'Gestor, supervisor, técnico e solicitante com acesso certo.'],
  ['chat', 'WhatsApp da OS', 'Envio para técnico ou cliente com as informações do chamado.'],
];

const PREMIUM: [string, string, string][] = [
  ['qr', 'Equipamentos + QR', 'Ficha do equipamento, fotos e histórico de manutenções.'],
  ['checklist', 'Checklist por categoria', 'Roteiros de execução para padronizar o serviço.'],
  ['caixa', 'Estoque', 'Entrada, saída e materiais usados vinculados à OS.'],
  ['grafico', 'Indicadores', 'Dashboard com produtividade, volume e tempo médio.'],
];

const INTEGRACOES: [string, string, string, string][] = [
  ['whatsapp', 'WhatsApp', 'OS e atendimento', 'Criação de OS, envio para técnico e compartilhamento do chamado com o cliente.'],
  ['totvs', 'TOTVS', 'ERP', 'Sincronização com rotinas operacionais, cadastros e dados administrativos.'],
  ['slack', 'Slack', 'Comunicação', 'Alertas de OS, mudanças de status e avisos para canais da equipe.'],
  ['pipedrive', 'Pipedrive', 'CRM', 'Clientes, oportunidades e solicitações comerciais conectadas ao atendimento.'],
  ['bancos', 'Contas bancárias', 'Financeiro', 'Leitura e conciliação de movimentações financeiras quando habilitado.'],
  ['omini', 'Omini', 'Omnichannel', 'Canais de atendimento integrados para centralizar a operação do cliente.'],
];

const PORQUES: [string, string, string][] = [
  ['raio', 'Implantação rápida', 'A equipe começa pelo básico e evolui sem travar a operação.'],
  ['checklist', 'Execução padronizada', 'Checklists, fotos e histórico reduzem retrabalho e esquecimento.'],
  ['grafico', 'Gestão com dados', 'Dashboard mostra volume, tempo médio, responsáveis e gargalos.'],
  ['usuario', 'Permissões por perfil', 'Gestor, supervisor, técnico e solicitante acessam só o que precisam.'],
];

const DORES: [string, string][] = [
  ['Chamado perdido no WhatsApp', 'Fila única de OS com status e responsável.'],
  ['Técnico sem roteiro', 'Checklist certo pela categoria do equipamento.'],
  ['Sem prova do serviço', 'Fotos, histórico e PDF da OS.'],
  ['Estoque sem controle', 'Baixa de material vinculada ao chamado.'],
];

const DEPOIMENTOS: [string, string, string, string][] = [
  ['Reduzimos o tempo de resposta dos chamados pela metade. A equipe aprendeu a usar no mesmo dia.', 'Marina Alves', 'Gerente de Facilities', 'MA'],
  ['A tela de OS ficou simples para o técnico e completa para o gestor. Era o equilíbrio que faltava.', 'Rodrigo Lima', 'Coordenador de Manutenção', 'RL'],
  ['O dashboard tirou nossa operação da planilha. Agora eu sei onde está o gargalo.', 'Patricia Souza', 'Diretora de Operações', 'PS'],
];

type LandingSection = 'fluxo' | 'porque' | 'modulos' | 'integracoes' | 'planos';

function scrollLanding(id: LandingSection) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function PhoneDemo() {
  return (
    <div className="phone-showcase" aria-hidden="true">
      <div className="phone-demo">
        <div className="phone-speaker" />
        <div className="phone-screen-v2">
          <div className="phone-app-top">
            <span>Lizzi Facilities</span>
            <b>OS-000128</b>
          </div>
          <div className="phone-tabs-v2">
            <span className="on">OS</span>
            <span>Checklist</span>
            <span>Fotos</span>
          </div>
          <div className="phone-body-v2">
            <div className="phone-os-card active">
              <div className="phone-card-head">
                <span>Ar condicionado</span>
                <b>Em execução</b>
              </div>
              <p>Sala 301 - Unidade Centro</p>
              <div className="phone-progress"><i /></div>
              <div className="phone-scan" />
            </div>
            <div className="phone-check-demo">
              <div><i /> Filtro limpo</div>
              <div><i /> Compressor testado</div>
              <div><i /> Foto anexada</div>
            </div>
            <div className="phone-media-row">
              <span><Icone nome="qr" size={20} /> ATV-8F42</span>
              <span><Icone nome="caixa" size={20} /> 2 materiais</span>
            </div>
            <div className="phone-mini-dash">
              <strong>37min<small>tempo</small></strong>
              <strong>91%<small>prazo</small></strong>
            </div>
          </div>
          <div className="phone-toast"><Icone nome="tecnico" size={16} /> Técnico atribuído</div>
        </div>
      </div>
    </div>
  );
}

function PlatformMark({ slug, title }: { slug: string; title: string }) {
  if (slug === 'slack') {
    return (
      <div className="platform-mark platform-slack" aria-hidden="true">
        <svg viewBox="0 0 48 48" role="img">
          <rect x="8" y="20" width="22" height="8" rx="4" fill="#36C5F0" />
          <rect x="20" y="8" width="8" height="22" rx="4" fill="#2EB67D" />
          <rect x="18" y="30" width="22" height="8" rx="4" fill="#ECB22E" />
          <rect x="30" y="18" width="8" height="22" rx="4" fill="#E01E5A" />
          <circle cx="12" cy="32" r="4" fill="#36C5F0" />
          <circle cx="32" cy="12" r="4" fill="#2EB67D" />
          <circle cx="36" cy="16" r="4" fill="#E01E5A" />
          <circle cx="16" cy="36" r="4" fill="#ECB22E" />
        </svg>
      </div>
    );
  }
  if (slug === 'bancos') {
    return (
      <div className="platform-mark platform-bancos" aria-hidden="true">
        <Icone nome="predio" size={28} />
      </div>
    );
  }
  if (slug === 'whatsapp') {
    return (
      <div className="platform-mark platform-whatsapp" aria-hidden="true">
        <Icone nome="chat" size={30} />
      </div>
    );
  }
  return (
    <div className={'platform-mark platform-' + slug} aria-hidden="true">
      <span>{slug === 'totvs' ? 'TOTVS' : title.charAt(0)}</span>
    </div>
  );
}

export default function Landing({ initialSection }: { initialSection?: LandingSection } = {}) {
  useScrollReveal();
  useEffect(() => {
    if (!initialSection) return;
    const timer = window.setTimeout(() => scrollLanding(initialSection), 80);
    return () => window.clearTimeout(timer);
  }, [initialSection]);

  function irPara(id: LandingSection) {
    if (window.location.hash !== '#/') window.history.replaceState(null, '', '#/');
    window.setTimeout(() => scrollLanding(id), 0);
  }

  const wa = `https://wa.me/${WHATSAPP_CONTATO}`;

  return (
    <div className="lp-page">
      <nav className="lp-nav lp-nav-v2">
        <Link to="/"><Logo /></Link>
        <span className="lp-nav-links">
          <button type="button" className="lp-link" onClick={() => irPara('integracoes')}>Integrações</button>
          <button type="button" className="lp-link" onClick={() => irPara('porque')}>Por que usar</button>
          <button type="button" className="lp-link" onClick={() => irPara('fluxo')}>Fluxo</button>
          <button type="button" className="lp-link" onClick={() => irPara('modulos')}>Módulos</button>
          <button type="button" className="lp-link" onClick={() => irPara('planos')}>Planos</button>
          <Link to="/login" className="btn sec sm">Entrar</Link>
          <Link to="/cadastro" className="btn sm">Criar conta</Link>
        </span>
      </nav>

      <header className="lp-hero-v2">
        <div className="lp-hero-inner">
          <div className="lp-hero-copy surge">
            <h1>Lizzi Facilities</h1>
            <p className="lp-hero-lead">Ordens de serviço, equipamentos, checklist, estoque e indicadores em uma operação simples de usar e bonita de acompanhar.</p>
            <div className="lp-cta">
              <Link to="/cadastro" className="btn lg">Criar conta grátis</Link>
              <button type="button" className="btn lg ghost" onClick={() => irPara('fluxo')}>Ver como funciona</button>
            </div>
            <div className="lp-proof">
              <div><b><Contador alvo={10} sufixo="min" /></b><span>para aprender</span></div>
              <div><b><Contador alvo={2} /></b><span>planos claros</span></div>
              <div><b><Contador alvo={100} sufixo="%" /></b><span>web responsivo</span></div>
            </div>
            <button type="button" className="hero-integrations" onClick={() => irPara('integracoes')}>
              <span>Integra com</span>
              <b>WhatsApp</b>
              <b>TOTVS</b><b>Slack</b><b>Pipedrive</b><b>Bancos</b><b>Omini</b>
            </button>
          </div>
          <PhoneDemo />
        </div>
      </header>

      <section className="lp-sec lp-integrations lp-integrations-top" id="integracoes">
        <div className="integration-story">
          <div className="integration-copy reveal">
            <span>Integrações</span>
            <h2>A Lizzi conecta sua manutenção aos sistemas que já fazem parte da operação</h2>
            <p>Seu cliente não precisa trocar tudo que usa hoje. A Lizzi entra como o centro operacional das OS e conversa com WhatsApp, ERP, comunicação, CRM, financeiro e canais de atendimento.</p>
            <div className="integration-points">
              <b>Criação e compartilhamento de OS via WhatsApp</b>
              <b>Menos retrabalho manual</b>
              <b>Alertas automáticos para a equipe</b>
              <b>Dados centralizados para decisão</b>
            </div>
            <button type="button" className="btn" onClick={() => irPara('planos')}>Ver planos integrados</button>
          </div>
          <div className="integration-network reveal">
            <div className="network-core">
              <Logo size={34} tagline={false} />
              <span>Centro da operação</span>
            </div>
            <div className="integrations-grid">
              {INTEGRACOES.map(([slug, titulo, tipo, texto], i) => (
                <div className="integration-item" key={titulo} style={{ animationDelay: `${i * 0.18}s` }}>
                  <PlatformMark slug={slug} title={titulo} />
                  <small>{tipo}</small>
                  <strong>{titulo}</strong>
                  <p>{texto}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="lp-strip reveal">
        {DORES.map(([antes, depois]) => (
          <div key={antes}>
            <span>{antes}</span>
            <b>{depois}</b>
          </div>
        ))}
      </section>

      <section className="lp-sec lp-why" id="porque">
        <div className="lp-section-head reveal">
          <span>Por que usar</span>
          <h2>O Lizzi Facilities organiza a manutenção sem complicar sua equipe</h2>
          <p>Ele junta OS, responsáveis, evidências, equipamentos, materiais e indicadores em um fluxo simples para o gestor e prático para o técnico.</p>
        </div>
        <div className="why-grid">
          {PORQUES.map(([ic, titulo, texto], i) => (
            <div className="why-card reveal" key={titulo} style={{ transitionDelay: `${i * 0.07}s` }}>
              <Icone nome={ic} size={26} />
              <h3>{titulo}</h3>
              <p>{texto}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-sec lp-flow" id="fluxo">
        <div className="lp-section-head reveal">
          <span>Fluxo de trabalho</span>
          <h2>Da abertura ao fechamento sem perder contexto</h2>
          <p>O sistema acompanha a OS como ela acontece: local, técnico, evidências, tempo, materiais e histórico.</p>
        </div>
        <div className="lp-flow-grid">
          {JORNADA.map(([ic, titulo, texto], i) => (
            <div className="lp-flow-step reveal" key={titulo} style={{ transitionDelay: `${i * 0.08}s` }}>
              <div className="step-index">{String(i + 1).padStart(2, '0')}</div>
              <Icone nome={ic} size={28} />
              <h3>{titulo}</h3>
              <p>{texto}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="lp-modules" id="modulos">
        <div className="lp-sec">
          <div className="lp-section-head reveal">
            <span>Módulos</span>
            <h2>Simples para começar. Premium para controlar tudo.</h2>
            <p>A operação básica fica limpa, e os recursos avançados aparecem quando o plano pede.</p>
          </div>
          <div className="module-columns">
            <div className="module-column reveal">
              <div className="module-title"><b>Plano Simples</b><span>OS e equipe</span></div>
              {SIMPLES.map(([ic, titulo, texto]) => (
                <div className="module-item" key={titulo}>
                  <Icone nome={ic} size={22} />
                  <span><b>{titulo}</b><small>{texto}</small></span>
                </div>
              ))}
            </div>
            <div className="module-column premium reveal" style={{ transitionDelay: '.1s' }}>
              <div className="module-title"><b>Plano Premium</b><span>Equipamentos e indicadores</span></div>
              {PREMIUM.map(([ic, titulo, texto]) => (
                <div className="module-item" key={titulo}>
                  <Icone nome={ic} size={22} />
                  <span><b>{titulo}</b><small>{texto}</small></span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="lp-sec lp-command">
        <div className="command-copy reveal">
          <span>Visão do gestor</span>
          <h2>Menos tela solta, mais decisão rápida.</h2>
          <p>Veja o que está aberto, quem está executando, quanto tempo levou e quais materiais foram usados.</p>
          <Link to="/cadastro?plano=premium" className="btn">Testar Premium</Link>
        </div>
        <div className="command-board reveal">
          <div className="board-head"><b>Dashboard</b><span>Hoje</span></div>
          <div className="board-bars">
            <i style={{ height: '64%' }} /><i style={{ height: '38%' }} /><i style={{ height: '82%' }} /><i style={{ height: '52%' }} /><i style={{ height: '70%' }} />
          </div>
          <div className="board-list">
            <span><b>Tempo médio</b><strong>37 min</strong></span>
            <span><b>OS concluídas</b><strong>28</strong></span>
            <span><b>Unidade crítica</b><strong>Bloco B</strong></span>
          </div>
        </div>
      </section>

      <section className="lp-depos-v2">
        <div className="lp-sec">
          <div className="lp-section-head reveal">
            <span>Prova social</span>
            <h2>Feito para equipes que precisam resolver, não decorar sistema.</h2>
          </div>
          <div className="depo-grid">
            {DEPOIMENTOS.map(([txt, nome, cargo, ini], i) => (
              <div className="depo reveal" key={nome} style={{ transitionDelay: `${i * 0.1}s` }}>
                <div className="stars">*****</div>
                <p>{txt}</p>
                <div className="quem"><div className="avatar">{ini}</div><div><b>{nome}</b><span>{cargo}</span></div></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="lp-sec" id="planos">
        <div className="lp-section-head reveal">
          <span>Planos</span>
          <h2>Escolha pelo momento da operação</h2>
          <p>Sem travar seu time: comece com OS e evolua para equipamentos, checklist, estoque e dashboard.</p>
        </div>
        <div className="lp-planos lp-planos-v2">
          <div className="lp-plano reveal">
            <h3>Simples</h3>
            <div className="plan-price"><strong>R$ 60,00</strong><span>/mês</span></div>
            <p>Para controlar chamados e equipe.</p>
            <ul>
              <li>Ordens de serviço</li>
              <li>Unidade, piso e local</li>
              <li>Técnicos e permissões</li>
              <li>Histórico e imagens</li>
              <li>Implementação sem cobrança</li>
              <li>Suporte prioritário</li>
            </ul>
            <Link to="/cadastro?plano=simples" className="btn sec" style={{ width: '100%' }}>Começar no Simples</Link>
          </div>
          <div className="lp-plano destaque reveal" style={{ transitionDelay: '.1s' }}>
            <span className="badge">Mais completo</span>
            <h3>Premium</h3>
            <div className="plan-price"><strong>R$ 150,00</strong><span>/mês</span></div>
            <p>Tudo do Simples com gestão de equipamentos.</p>
            <ul>
              <li>Equipamentos com QR Code</li>
              <li>Checklist por categoria</li>
              <li>Estoque vinculado a OS</li>
              <li>Dashboard operacional</li>
              <li>Implementação: R$ 300,00</li>
              <li>Suporte prioritário</li>
            </ul>
            <Link to="/cadastro?plano=premium" className="btn" style={{ width: '100%' }}>Começar no Premium</Link>
          </div>
        </div>
      </section>

      <section className="lp-final-v2 reveal">
        <div>
          <span>Pronto para organizar a manutenção?</span>
          <h2>Crie sua conta e libere a operação depois da aprovação.</h2>
        </div>
        <div className="lp-final-actions">
          <Link to="/cadastro" className="btn lg">Criar conta grátis</Link>
          <a href={wa} className="btn lg sec">Falar no WhatsApp</a>
        </div>
      </section>

      <footer className="lp-foot">
        <div className="lp-foot-grid">
          <div>
            <Logo variant="light" />
            <p>Gestão de manutenção e equipamentos.<br />CNPJ 58.030.824/0001-94</p>
          </div>
          <div>
            <strong style={{ color: '#fff' }}>Produto</strong>
            <p>
              <button type="button" onClick={() => irPara('fluxo')}>Fluxo</button><br />
              <button type="button" onClick={() => irPara('porque')}>Por que usar</button><br />
              <button type="button" onClick={() => irPara('modulos')}>Módulos</button><br />
              <button type="button" onClick={() => irPara('integracoes')}>Integrações</button><br />
              <button type="button" onClick={() => irPara('planos')}>Planos</button><br />
              <Link to="/solucoes">Soluções</Link>
            </p>
          </div>
          <div>
            <strong style={{ color: '#fff' }}>Legal</strong>
            <p><Link to="/privacidade">Política de Privacidade</Link><br /><Link to="/termos">Termos de Uso</Link></p>
          </div>
          <div>
            <strong style={{ color: '#fff' }}>Contato</strong>
            <p><a href={wa}>WhatsApp</a><br /><Link to="/login">Entrar</Link></p>
          </div>
        </div>
        <div className="copy">(c) {new Date().getFullYear()} Lizzi Facilities - CNPJ 58.030.824/0001-94 - Todos os direitos reservados.</div>
      </footer>

      <WhatsappFlutuante />
    </div>
  );
}
