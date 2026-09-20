import type { Metadata } from 'next';
import './globals.css';
import './admin.css';
import './landing.css';
import './operations.css';
import './theme.css';
export const metadata: Metadata = { title: 'CasoZero', description: 'Atendimento inteligente e organização para profissionais de diferentes áreas.', icons: { icon: '/casozero/favicon.png' } };
export default function Layout({children}:{children:React.ReactNode}) { return <html lang="pt-BR"><body>{children}</body></html>; }
