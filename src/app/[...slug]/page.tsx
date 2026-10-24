import { Suspense } from 'react';
import PublicRoute from '@/components/public/profile';
import { DEMO_SLUG } from '@/mocks/data';
export default function PublicPage() { return <Suspense fallback={<main className="public-shell"><section className="public-card"><p>Carregando…</p></section></main>}><PublicRoute /></Suspense>; }
export function generateStaticParams() { return [{ slug: [DEMO_SLUG] }, { slug: [DEMO_SLUG, 'agendar'] }]; }
