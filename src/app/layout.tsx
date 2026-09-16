import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'CasoZero', description: 'Pré-atendimento inteligente para advocacia' };
export default function Layout({children}:{children:React.ReactNode}) { return <html lang="pt-BR"><body>{children}</body></html>; }
