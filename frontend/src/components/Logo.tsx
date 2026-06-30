interface Props {
  size?: number;                 // tamanho do "badge" (mark)
  variant?: 'light' | 'dark';    // light = sobre fundo escuro (texto branco)
  tagline?: boolean;             // mostra "FACILITIES"
}

const LOGO_SRC = `${process.env.PUBLIC_URL}/logo_tipo.png`;

// Logo da marca: usa o ícone oficial em PNG + wordmark.
export default function Logo({ size = 34, variant = 'dark', tagline = true }: Props) {
  return (
    <span className="lz-logo">
      <img className="lz-mark" src={LOGO_SRC} alt="" style={{ width: size, height: size }} />
      <span className={'lz-word' + (variant === 'light' ? ' lz-light' : '')}>
        <b>Lizzi</b>
        {tagline && <small>FACILITIES</small>}
      </span>
    </span>
  );
}
