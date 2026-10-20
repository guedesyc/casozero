import { Suspense } from 'react';
import Booking from '@/components/public/booking';
import { DEMO_SLUG } from '@/mocks/data';
export default function PublicPage() { return <Suspense fallback={<main className="public-shell"><section className="public-card"><p>Carregando…</p></section></main>}><Booking /></Suspense>; }
export function generateStaticParams() { return [{ slug: [DEMO_SLUG] }]; }
