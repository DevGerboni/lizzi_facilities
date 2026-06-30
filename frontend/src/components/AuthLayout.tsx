import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import Icone from './Icones';
import Logo from './Logo';

const BULLETS: [string, string][] = [
  ['chave', 'Ordens de serviço com status e tempos automáticos'],
  ['qr', 'Equipamentos com QR Code e histórico completo'],
  ['grafico', 'Dashboard de indicadores em tempo real'],
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth-wrap">
      <aside className="auth-side">
        <span className="orb orb1" /><span className="orb orb2" />
        {/* ícones levitando (efeito "antigravity") */}
        <div className="float-icons" aria-hidden="true">
          <span className="float-chip" style={{ top: '12%', left: '14%', animationDuration: '7s' }}><Icone nome="chave" size={26} /></span>
          <span className="float-chip" style={{ top: '58%', left: '9%', animationDuration: '9s', animationDelay: '.6s' }}><Icone nome="qr" size={26} /></span>
          <span className="float-chip" style={{ top: '26%', right: '12%', animationDuration: '8s', animationDelay: '.3s' }}><Icone nome="checklist" size={26} /></span>
          <span className="float-chip" style={{ top: '70%', right: '16%', animationDuration: '6.5s', animationDelay: '1s' }}><Icone nome="grafico" size={26} /></span>
          <span className="float-chip" style={{ top: '42%', left: '46%', animationDuration: '10s', animationDelay: '.2s' }}><Icone nome="engrenagem" size={26} /></span>
        </div>
        <div className="auth-side-content surge">
          <Link to="/" style={{ display: 'inline-block' }}><Logo variant="light" size={42} /></Link>
          <h2>Gestão de manutenção e equipamentos, sem complicação.</h2>
          <ul className="auth-bullets">
            {BULLETS.map(([ic, t]) => (
              <li key={t}><Icone nome={ic} size={20} /> {t}</li>
            ))}
          </ul>
          <p className="auth-foot">CNPJ 58.030.824/0001-94</p>
        </div>
      </aside>

      <main className="auth-form-area">
        <div className="auth-card surge">
          <Link to="/" className="auth-logo-mobile"><Logo size={34} /></Link>
          {children}
        </div>
      </main>
    </div>
  );
}
