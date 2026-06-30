import { Link } from 'react-router-dom';
import WhatsappFlutuante from '../components/WhatsappFlutuante';
import Logo from '../components/Logo';

export default function Privacidade() {
  return (
    <div>
      <nav className="lp-nav">
        <Link to="/"><Logo /></Link>
        <Link to="/" className="btn sec sm">← Voltar</Link>
      </nav>

      <div className="doc">
        <h1>Política de Privacidade</h1>
        <p style={{ color: 'var(--texto-suave)' }}>Última atualização: junho de 2026</p>

        <p>Esta Política descreve como a <strong>Lizzi Facilities</strong> (CNPJ 58.030.824/0001-94) coleta, usa e protege
        os dados pessoais tratados na plataforma, em conformidade com a Lei Geral de Proteção de Dados (LGPD – Lei nº 13.709/2018).</p>

        <h2>1. Dados que coletamos</h2>
        <ul>
          <li><strong>Cadastro:</strong> nome, e-mail, telefone/WhatsApp, empresa e senha (armazenada de forma criptografada).</li>
          <li><strong>Uso do sistema:</strong> ordens de serviço, equipamentos, unidades, materiais e registros de atividade (logs).</li>
          <li><strong>Dados técnicos:</strong> endereço IP e informações de acesso para segurança.</li>
        </ul>

        <h2>2. Como usamos os dados</h2>
        <ul>
          <li>Prover e operar a plataforma de gestão de manutenção e equipamentos.</li>
          <li>Autenticar usuários e manter a segurança das contas.</li>
          <li>Enviar comunicações operacionais (ex.: notificações de OS via WhatsApp, quando habilitado).</li>
          <li>Melhorar o serviço e cumprir obrigações legais.</li>
        </ul>

        <h2>3. Isolamento e compartilhamento</h2>
        <p>Os dados de cada empresa são mantidos isolados em seu próprio ambiente. Não vendemos dados pessoais.
        O compartilhamento ocorre apenas com provedores essenciais à operação (ex.: hospedagem e envio de mensagens) ou por obrigação legal.</p>

        <h2>4. Seus direitos (LGPD)</h2>
        <p>Você pode solicitar acesso, correção, portabilidade, anonimização ou exclusão dos seus dados, além de revogar consentimentos.
        Para exercer esses direitos, entre em contato pelos canais abaixo.</p>

        <h2>5. Segurança</h2>
        <p>Adotamos medidas técnicas e organizacionais para proteger os dados, incluindo criptografia de senhas, controle de acesso por perfil
        e comunicação via HTTPS. Nenhum dado é excluído fisicamente sem registro (exclusão lógica).</p>

        <h2>6. Retenção</h2>
        <p>Mantemos os dados pelo tempo necessário à prestação do serviço e ao cumprimento de obrigações legais. Após esse período, os dados podem ser anonimizados ou eliminados.</p>

        <h2>7. Contato</h2>
        <p>Lizzi Facilities — CNPJ 58.030.824/0001-94. Dúvidas sobre privacidade? Fale com a gente pelo WhatsApp ou pelos canais informados na plataforma.</p>

        <p style={{ marginTop: 30 }}><Link to="/termos">Ver também: Termos de Uso →</Link></p>
      </div>
      <WhatsappFlutuante />
    </div>
  );
}
