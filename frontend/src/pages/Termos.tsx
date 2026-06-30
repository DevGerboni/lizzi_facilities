import { Link } from 'react-router-dom';
import WhatsappFlutuante from '../components/WhatsappFlutuante';
import Logo from '../components/Logo';

export default function Termos() {
  return (
    <div>
      <nav className="lp-nav">
        <Link to="/"><Logo /></Link>
        <Link to="/" className="btn sec sm">← Voltar</Link>
      </nav>

      <div className="doc">
        <h1>Termos de Uso</h1>
        <p style={{ color: 'var(--texto-suave)' }}>Última atualização: junho de 2026</p>

        <p>Estes Termos regem o uso da plataforma <strong>Lizzi Facilities</strong> (CNPJ 58.030.824/0001-94). Ao criar uma conta
        ou utilizar o sistema, você concorda com estas condições.</p>

        <h2>1. O serviço</h2>
        <p>A Lizzi Facilities é uma plataforma SaaS para gestão de manutenção e equipamentos (ordens de serviço, equipamentos, estoque e indicadores),
        disponibilizada nos planos Simples e Premium.</p>

        <h2>2. Conta e responsabilidade</h2>
        <ul>
          <li>Você é responsável pela veracidade dos dados informados no cadastro.</li>
          <li>As credenciais de acesso são pessoais e intransferíveis; mantenha-as em sigilo.</li>
          <li>O administrador da empresa é responsável pela gestão dos usuários do seu ambiente.</li>
        </ul>

        <h2>3. Planos e funcionalidades</h2>
        <p>As funcionalidades disponíveis dependem do plano contratado. Recursos marcados como Premium ficam restritos a contas nesse plano.</p>

        <h2>4. Uso adequado</h2>
        <p>É vedado utilizar a plataforma para fins ilícitos, tentar acessar dados de outras empresas, sobrecarregar a infraestrutura
        ou realizar engenharia reversa do sistema.</p>

        <h2>5. Dados</h2>
        <p>O tratamento de dados segue a nossa <Link to="/privacidade">Política de Privacidade</Link>. Os dados inseridos pela empresa
        permanecem de sua titularidade.</p>

        <h2>6. Disponibilidade</h2>
        <p>Empenhamo-nos para manter o serviço disponível, mas ele é fornecido “no estado em que se encontra”. Poderá haver manutenções
        programadas e eventuais indisponibilidades.</p>

        <h2>7. Cancelamento</h2>
        <p>Você pode solicitar o encerramento da conta a qualquer momento. Dados poderão ser retidos pelo período exigido por lei.</p>

        <h2>8. Alterações</h2>
        <p>Estes Termos podem ser atualizados. Mudanças relevantes serão comunicadas pelos canais da plataforma.</p>

        <h2>9. Contato</h2>
        <p>Lizzi Facilities — CNPJ 58.030.824/0001-94. Dúvidas? Fale com a gente pelo WhatsApp.</p>

        <p style={{ marginTop: 30 }}><Link to="/privacidade">Ver também: Política de Privacidade →</Link></p>
      </div>
      <WhatsappFlutuante />
    </div>
  );
}
