import type { Metadata } from 'next';

/** Link privado de acompanhamento: fora dos buscadores. */
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function TrackLayout({ children }: { children: React.ReactNode }) { return children; }
