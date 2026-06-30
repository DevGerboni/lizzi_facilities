import { Link } from 'react-router-dom';
import WhatsappFlutuante from '../components/WhatsappFlutuante';
import Icone from '../components/Icones';
import Logo from '../components/Logo';
import { useScrollReveal } from '../lib/useReveal';

// problema (antes) -> solução (depois)
const RESOLVE: [string, string][] = [
  ['Chamado perdido no meio das conversas de WhatsApp.', 'Cada chamado vira uma OS com código, responsável, status e histórico.'],
  ['Ninguém sabe o histórico do equipamento que vive quebrando.', 'Cada equipamento tem ficha, QR Code e todo o histórico de manutenções.'],
  ['Planilha desatualizada e sem controle de quem fez o quê.', 'Tudo registrado automaticamente, com log de cada ação e usuário.'],
  ['Técnico sem roteiro: esquece etapas da manutenção.', 'Checklist por categoria carregado na hora, com foto e observação.'],
  ['Materiais somem e o estoque nunca bate.', 'Baixa automática de material por OS e saldo sempre atualizado.'],
  ['Gestor sem números para cobrar resultado.', 'Dashboard com tempo médio, chamados por técnico e por unidade.'],
];

const SEGMENTOS: [string, string][] = [
  ['predio', 'Condomínios'],
  ['engrenagem', 'Indústrias'],
  ['caixa', 'Redes de lojas'],
  ['checklist', 'Hospitais e clínicas'],
  ['prancheta', 'Escolas'],
  ['chave', 'Empresas de facilities'],
];

const BENEFICIOS: [string, string, string][] = [
  ['relogio', 'Resposta mais rápida', 'Chamados organizados e atribuídos na hora — nada se perde.'],
  ['grafico', 'Decisão com dados', 'Indicadores prontos para reuniões e cobrança de metas.'],
  ['raio', 'Implantação simples', 'Sua equipe começa a usar no mesmo dia, sem treinamento longo.'],
];

export default function Solucoes() {
  useScrollReveal();
  return (
    <div>
      <nav className="lp-nav">
        <Link to="/"><Logo /></Link>
        <span style={{ display: 'flex', gap: 8 }}>
          <Link to="/login" className="btn sec sm">Entrar</Link>
          <Link to="/cadastro" className="btn sm">Criar conta</Link>
        </span>
      </nav>

      {/* intro */}
      <header className="lp-hero" style={{ paddingBottom: 80 }}>
        <span className="orb orb1" /><span className="orb orb2" />
        <div style={{ position: 'relative', zIndex: 2, maxWidth: 820, margin: '0 auto', textAlign: 'center' }} className="surge">
          <span className="lp-pill"><Icone nome="chave" size={16} /> Soluções para manutenção e facilities</span>
          <h1>O que a Lizzi <span className="grad-text">resolve</span> na sua operação</h1>
          <p className="sub" style={{ margin: '0 auto 26px' }}>Saia das planilhas e dos chamados perdidos no WhatsApp. Centralize manutenção, equipes e equipamentos em uma ferramenta simples.</p>
          <Link to="/cadastro" className="btn lg" style={{ background: '#fff', color: 'var(--azul)' }}>Começar agora</Link>
        </div>
      </header>

      {/* problema -> solução */}
      <section className="lp-sec">
        <h2 className="reveal">Do problema à solução</h2>
        <p className="sub reveal">Os gargalos mais comuns da manutenção — e como a Lizzi resolve cada um.</p>
        <div className="ps-grid">
          {RESOLVE.map(([antes, depois], i) => (
            <div className="ps-card reveal" key={antes} style={{ transitionDelay: `${i * 0.06}s` }}>
              <div className="antes">✕ Antes</div>
              <p>{antes}</p>
              <div className="depois">✓ Com a Lizzi</div>
              <p>{depois}</p>
            </div>
          ))}
        </div>
      </section>

      {/* como funciona / uso */}
      <section className="lp-sec lp-passos">
        <h2 className="reveal">Como usar no dia a dia</h2>
        <p className="sub reveal">Quatro passos simples — do chamado ao indicador.</p>
        <div className="passos">
          {[
            ['prancheta', '1. Abra o chamado', 'Solicitante registra unidade, local e o defeito (com fotos, se quiser).'],
            ['tecnico', '2. Atribua o técnico', 'Agende data/hora ou envie para execução imediata. Avise pelo WhatsApp.'],
            ['checklist', '3. Execute', 'Técnico segue o checklist da categoria, registra tempos e dá baixa nos materiais.'],
            ['grafico', '4. Acompanhe', 'Status em tempo real e indicadores no dashboard para o gestor.'],
          ].map(([ic, t, d], i) => (
            <div className="passo reveal" key={t} style={{ transitionDelay: `${i * 0.08}s` }}>
              <div className="passo-num">{i + 1}</div>
              <div className="passo-ic"><Icone nome={ic} size={26} /></div>
              <h3>{t.replace(/^\d+\.\s/, '')}</h3>
              <p>{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* para quem é */}
      <section className="lp-sec">
        <h2 className="reveal">Para quem é</h2>
        <p className="sub reveal">Qualquer operação que precisa controlar manutenção e equipamentos.</p>
        <div className="seg-grid">
          {SEGMENTOS.map(([ic, nome], i) => (
            <div className="seg reveal" key={nome} style={{ transitionDelay: `${i * 0.05}s` }}>
              <div className="ic"><Icone nome={ic} size={30} /></div>
              <b>{nome}</b>
            </div>
          ))}
        </div>
      </section>

      {/* benefícios */}
      <section className="lp-depos">
        <div className="lp-sec">
          <h2 className="reveal">Por que escolher a Lizzi</h2>
          <div className="lp-feats">
            {BENEFICIOS.map(([ic, t, d], i) => (
              <div className="lp-feat reveal" key={t} style={{ transitionDelay: `${i * 0.08}s` }}>
                <div className="ic"><Icone nome={ic} size={26} /></div>
                <h3>{t}</h3>
                <p style={{ color: 'var(--texto-suave)', margin: 0 }}>{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ paddingBottom: 72 }}>
        <div className="lp-final reveal">
          <h2>Vamos organizar sua manutenção?</h2>
          <p style={{ opacity: .95, fontSize: 18 }}>Crie sua conta grátis e comece hoje.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 20 }}>
            <Link to="/cadastro" className="btn lg" style={{ background: '#fff', color: 'var(--azul)' }}>Criar conta grátis</Link>
            <Link to="/" className="btn lg ghost">Voltar ao início</Link>
          </div>
        </div>
      </section>

      <footer className="lp-foot">
        <div className="copy">© {new Date().getFullYear()} Lizzi Facilities · CNPJ 58.030.824/0001-94 · <Link to="/privacidade">Privacidade</Link> · <Link to="/termos">Termos</Link></div>
      </footer>

      <WhatsappFlutuante />
    </div>
  );
}
