import { useEffect, useRef, useState } from 'react';

// Conta de 0 até `alvo` quando entra na tela (efeito "não estático").
export default function Contador({ alvo, sufixo = '', duracao = 1400 }: { alvo: number; sufixo?: string; duracao?: number }) {
  const [valor, setValor] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const iniciado = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const animar = () => {
      if (iniciado.current) return;
      iniciado.current = true;
      const inicio = performance.now();
      const passo = (t: number) => {
        const p = Math.min((t - inicio) / duracao, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        setValor(Math.round(eased * alvo));
        if (p < 1) requestAnimationFrame(passo);
      };
      requestAnimationFrame(passo);
    };
    if (!('IntersectionObserver' in window)) { animar(); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) animar(); });
    }, { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, [alvo, duracao]);

  return <span ref={ref}>{valor}{sufixo}</span>;
}
