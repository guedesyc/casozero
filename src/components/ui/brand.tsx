import { useId } from 'react';

// Símbolo da marca: o zero com a caderneta e a caneta dentro. Desenhado no espaço 100×140 e pintado com a cor do texto.
// Os arquivos finais (SVG/PNG, ícone e favicon) ficam em brand/.
export function BrandMark({ className }: { className?: string }) {
  const id = useId().replace(/:/g, '');
  const pen = 'M-4 -30Q-4 -32 -2 -32H2Q4 -32 4 -30V-11L0 -1L-4 -11Z';
  return <svg className={className} viewBox="0 0 100 140" aria-hidden="true" focusable="false">
    <defs>
      <mask id={`l${id}`} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="140"><rect width="100" height="140" fill="#fff"/><path transform="translate(50 90) rotate(30)" d={pen} fill="#000" stroke="#000" strokeWidth="5" strokeLinejoin="round"/></mask>
      <mask id={`p${id}`} maskUnits="userSpaceOnUse" x="-20" y="-40" width="40" height="50"><rect x="-20" y="-40" width="40" height="50" fill="#fff"/><path d="M-5 -14H5" stroke="#000" strokeWidth="1.6"/></mask>
    </defs>
    <path fill="currentColor" fillRule="evenodd" d="M50 8A42 42 0 0 1 92 50V90A42 42 0 0 1 8 90V50A42 42 0 0 1 50 8ZM34.8 34.7H59.1L67.5 44V102.8Q67.5 105.3 65.2 105.3H34.8Q32.5 105.3 32.5 102.8V37.2Q32.5 34.7 34.8 34.7Z"/>
    <path fill="currentColor" d="M59.1 34.7V41.4Q59.1 44 61.4 44H67.5Z"/>
    <g transform="translate(50 70) scale(0.78) translate(-50 -70)">
      <path mask={`url(#l${id})`} d="M34 48H58M34 58H60M34 68H54M34 79H47M34 90H42" fill="none" stroke="currentColor" strokeWidth="3.8" strokeLinecap="round"/>
      <g transform="translate(50 90) rotate(30)"><path mask={`url(#p${id})`} d={pen} fill="currentColor"/></g>
    </g>
  </svg>;
}

// Símbolo + nome, para cabeçalhos. O nome continua sendo texto (Fraunces), então herda tamanho e cor de quem usa.
export function BrandLockup() {
  return <><BrandMark className="brand-mark-svg"/><span>CasoZero</span></>;
}
