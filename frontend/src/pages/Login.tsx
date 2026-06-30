import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import AuthLayout from '../components/AuthLayout';
import Icone from '../components/Icones';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setErro(''); setCarregando(true);
    try {
      const usuario = await login(email.trim(), senha);
      nav(usuario.perfil === 'admin_geral' ? '/app/empresas' : '/app');
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Falha no login');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <AuthLayout>
      <h2 style={{ color: 'var(--azul)' }}>Bem-vindo de volta 👋</h2>
      <p style={{ color: 'var(--texto-suave)', marginTop: 0 }}>Entre na sua conta para continuar.</p>
      {erro && <div className="msg-erro">{erro}</div>}
      <form onSubmit={enviar}>
        <label>E-mail</label>
        <div className="campo">
          <span className="campo-ic"><Icone nome="email" size={18} /></span>
          <input className="input com-ic" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
        </div>
        <label>Senha</label>
        <div className="campo">
          <span className="campo-ic"><Icone nome="cadeado" size={18} /></span>
          <input className="input com-ic" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
        </div>
        <button className="btn lg" style={{ width: '100%', marginTop: 18 }} disabled={carregando}>
          {carregando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
      <p style={{ marginTop: 16, fontSize: 14, color: 'var(--texto-suave)' }}>
        Não tem conta? <Link to="/cadastro">Criar conta grátis</Link>
      </p>
    </AuthLayout>
  );
}
