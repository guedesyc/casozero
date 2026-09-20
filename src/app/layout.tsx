import type { Metadata } from 'next';
import './globals.css';
import './admin.css';
import './landing.css';
import './operations.css';
import './theme.css';
export const metadata: Metadata = { title: 'CasoZero', description: 'Pré-atendimento inteligente para advocacia' };
export default function Layout({children}:{children:React.ReactNode}) { return <html lang="pt-BR"><body>{children}</body></html>; }
