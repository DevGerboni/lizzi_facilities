// Loading com efeito "antigravity": orbs que flutuam suavemente.
export default function Loading({ texto = 'Carregando...' }: { texto?: string }) {
  return (
    <div className="loading">
      <div className="loading-orbs" aria-hidden="true"><i /><i /><i /></div>
      {texto && <div className="loading-txt">{texto}</div>}
    </div>
  );
}
