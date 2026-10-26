import { Suspense } from 'react';
import type { Metadata } from 'next';
import PublicRoute from '@/components/public/profile';
import { DEMO_SLUG } from '@/mocks/data';

/** Só a página do profissional entra na busca; as telas de agendamento não são indexadas. */
export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }): Promise<Metadata> {
  const { slug } = await params;
  return slug[1] === 'agendar' ? { robots: { index: false, follow: false } } : {};
}

export default function PublicPage() { return <Suspense fallback={<main className="public-shell"><section className="public-card"><p>Carregando…</p></section></main>}><PublicRoute /></Suspense>; }
export function generateStaticParams() { return [{ slug: [DEMO_SLUG] }, { slug: [DEMO_SLUG, 'agendar'] }]; }
