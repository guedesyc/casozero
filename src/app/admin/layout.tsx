import type { Metadata } from 'next';

/** Painel da plataforma: fora dos buscadores. */
export const metadata: Metadata = { title: 'Admin | CasoZero', robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) { return children; }
