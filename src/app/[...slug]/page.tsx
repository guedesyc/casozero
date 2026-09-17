import { Suspense } from 'react';
import Interview from '@/components/public/interview';
export default function PublicPage(){ return <Suspense fallback={<main className="public-shell"><section className="public-card"><p>Carregando atendimento…</p></section></main>}><Interview/></Suspense>; }
export function generateStaticParams(){ return [{slug:['muriloguedes']},{slug:['muriloguedes','trabalhista']},{slug:['muriloguedes','consumidor']}]; }
