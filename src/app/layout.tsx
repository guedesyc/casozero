import type { Metadata } from 'next';
import './globals.css';
import './landing.css';
import './operations.css';
import './theme.css';
import './health.css';
import { NavigationLoader } from '@/components/ui/navigation-loader';
export const metadata: Metadata = { title: 'CasoZero', description: 'Agendamento de triagem, agenda e caderneta de sessões para profissionais da saúde.', icons: { icon: '/casozero/favicon.png' } };
export default function Layout({children}:{children:React.ReactNode}) { return <html lang="pt-BR"><body>{children}<NavigationLoader/></body></html>; }
