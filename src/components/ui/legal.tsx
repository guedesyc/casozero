import Link from 'next/link';
import { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { BrandLockup } from '@/components/ui/brand';

/** Versão em vigor dos termos e da política; vai junto com o aceite no cadastro. */
export const LEGAL_VERSION = '2026-10-27';
export const LEGAL_DATE = '27 de outubro de 2026';
export const CONTACT_EMAIL = 'contato@casozero.com.br';

/** Moldura das páginas de termos e privacidade. */
export function LegalPage({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro: ReactNode; children: ReactNode }) {
  return <main className="legal-page">
    <header className="legal-top"><Link href="/" className="brand-lockup" aria-label="CasoZero"><BrandLockup /></Link><Link href="/" className="legal-back"><ArrowLeft size={14} /> Voltar</Link></header>
    <article className="legal-body">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p className="legal-meta">Versão de {LEGAL_DATE}</p>
      <div className="legal-intro">{intro}</div>
      {children}
      <p className="legal-meta legal-foot">Dúvidas ou pedidos: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Veja também os <Link href="/termos">Termos de uso</Link> e a <Link href="/privacidade">Política de privacidade</Link>.</p>
    </article>
  </main>;
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return <section className="legal-section"><h2>{title}</h2>{children}</section>;
}
