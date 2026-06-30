import { useState, FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import AuthLayout from '../components/AuthLayout';
import Icone from '../components/Icones';

export default function Cadastro() {
  const { cadastrar } = useAuth();
  const [params] = useSearchParams();
  const [enviado, setEnviado] = useState(false);

  const [empresaNome, setEmpresaNome] = useState('');
  const [adminNome, setAdminNome] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminSenha, setAdminSenha] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [plano, setPlano] = useState(params.get('plano') === 'premium' ? 'premium' : 'simples');
  const [website, setWebsite] = useState(''); // honeypot
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro(''); setSalvando(true);
    try {
      await cadastrar({
        empresa_nome: empresaNome.trim(),
        plano,
        admin_nome: adminNome.trim(),
        admin_email: adminEmail.trim(),
        admin_senha: adminSenha,
        whatsapp: whatsapp.trim() || undefined,
        website: website.trim() || undefined,
      });
      setEnviado(true);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Falha no cadastro');
      setSalvando(false);
    }
  }

  if (enviado) {
    return (
      <AuthLayout>
        <div className="center">
          <div className="aviso-ok"><Icone nome="checklist" size={34} /></div>
          <h2 style={{ color: 'var(--azul)' }}>Cadastro recebido! 🎉</h2>
          <p style={{ color: 'var(--texto-suave)' }}>
            Sua conta está <strong>em análise</strong>. Assim que for aprovada, você poderá acessar com seu e-mail e senha.
            Avisaremos você em breve.
          </p>
          <Link to="/" className="btn lg" style={{ width: '100%', marginTop: 10 }}>Voltar ao site</Link>
          <p style={{ marginTop: 14, fontSize: 14 }}><Link to="/login">Ir para o login</Link></p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <h2 style={{ color: 'var(--azul)' }}>Crie sua conta</h2>
      <p style={{ color: 'var(--texto-suave)', marginTop: 0 }}>Leva menos de 1 minuto. Sem cartão de crédito.</p>
      {erro && <div className="msg-erro">{erro}</div>}
      <form onSubmit={enviar}>
        <label>Nome da empresa *</label>
        <div className="campo">
          <span className="campo-ic"><Icone nome="predio" size={18} /></span>
          <input className="input com-ic" value={empresaNome} onChange={(e) => setEmpresaNome(e.target.value)} required autoFocus />
        </div>

        <label>Seu nome *</label>
        <div className="campo">
          <span className="campo-ic"><Icone nome="usuario" size={18} /></span>
          <input className="input com-ic" value={adminNome} onChange={(e) => setAdminNome(e.target.value)} required />
        </div>

        <label>E-mail *</label>
        <div className="campo">
          <span className="campo-ic"><Icone nome="email" size={18} /></span>
          <input className="input com-ic" type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} required />
        </div>

        <div className="grid cols2" style={{ gap: 0, columnGap: 12 }}>
          <div>
            <label>WhatsApp</label>
            <div className="campo">
              <span className="campo-ic"><Icone nome="chat" size={18} /></span>
              <input className="input com-ic" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="5511999999999" />
            </div>
          </div>
          <div>
            <label>Senha *</label>
            <div className="campo">
              <span className="campo-ic"><Icone nome="cadeado" size={18} /></span>
              <input className="input com-ic" type="password" value={adminSenha} onChange={(e) => setAdminSenha(e.target.value)} required minLength={6} />
            </div>
          </div>
        </div>

        <label>Plano</label>
        <div className="plano-toggle">
          <button type="button" className={plano === 'simples' ? 'on' : ''} onClick={() => setPlano('simples')}>Simples</button>
          <button type="button" className={plano === 'premium' ? 'on' : ''} onClick={() => setPlano('premium')}>Premium</button>
        </div>

        <input type="text" value={website} onChange={(e) => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off"
               style={{ position: 'absolute', left: '-9999px' }} aria-hidden="true" />

        <button className="btn lg" style={{ width: '100%', marginTop: 18 }} disabled={salvando}>
          {salvando ? 'Criando conta…' : 'Criar conta grátis'}
        </button>
      </form>
      <p style={{ marginTop: 16, fontSize: 14, color: 'var(--texto-suave)' }}>
        Já tem conta? <Link to="/login">Entrar</Link>
      </p>
    </AuthLayout>
  );
}
