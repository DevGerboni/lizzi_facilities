import { PointerEvent, useEffect, useRef, useState } from 'react';

interface Props {
  titulo: string;
  imagemUrl?: string | null;
  bloqueado?: boolean;
  onSalvar: (arquivo: File) => Promise<void>;
}

function dataUrlParaFile(dataUrl: string, nome: string): File {
  const [meta, data] = dataUrl.split(',');
  const mime = /data:(.*?);base64/.exec(meta)?.[1] || 'image/png';
  const bin = atob(data);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return new File([bytes], nome, { type: mime });
}

export default function AssinaturaPad({ titulo, imagemUrl, bloqueado = false, onSalvar }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const desenhando = useRef(false);
  const [temTraco, setTemTraco] = useState(false);
  const [salvando, setSalvando] = useState(false);

  function prepararCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * ratio));
    canvas.height = Math.max(1, Math.floor(rect.height * ratio));
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f1b34';
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, rect.width, rect.height);
  }

  useEffect(() => {
    prepararCanvas();
    window.addEventListener('resize', prepararCanvas);
    return () => window.removeEventListener('resize', prepararCanvas);
  }, []);

  function ponto(ev: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: ev.clientX - rect.left, y: ev.clientY - rect.top };
  }

  function iniciar(ev: PointerEvent<HTMLCanvasElement>) {
    if (bloqueado) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    desenhando.current = true;
    canvas.setPointerCapture(ev.pointerId);
    const p = ponto(ev);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }

  function mover(ev: PointerEvent<HTMLCanvasElement>) {
    if (!desenhando.current || bloqueado) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const p = ponto(ev);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    setTemTraco(true);
  }

  function parar() {
    desenhando.current = false;
  }

  function limpar() {
    prepararCanvas();
    setTemTraco(false);
  }

  async function salvar() {
    const canvas = canvasRef.current;
    if (!canvas || !temTraco) return;
    setSalvando(true);
    try {
      await onSalvar(dataUrlParaFile(canvas.toDataURL('image/png'), 'assinatura.png'));
      limpar();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="assinatura-box">
      <div className="assinatura-topo">
        <strong>{titulo}</strong>
        {imagemUrl && <span className="badge">salva</span>}
      </div>
      {imagemUrl && <img className="assinatura-preview" src={imagemUrl} alt={titulo} />}
      {!bloqueado && (
        <>
          <canvas
            ref={canvasRef}
            className="assinatura-canvas"
            onPointerDown={iniciar}
            onPointerMove={mover}
            onPointerUp={parar}
            onPointerCancel={parar}
          />
          <div className="form-actions">
            <button type="button" className="btn sec sm" onClick={limpar}>Limpar</button>
            <button type="button" className="btn sm" disabled={!temTraco || salvando} onClick={salvar}>
              {salvando ? 'Salvando...' : 'Salvar assinatura'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
