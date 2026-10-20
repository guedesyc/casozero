'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import { CalendarDays, Clock3, CreditCard, ExternalLink, Inbox, LayoutDashboard, Link2, Settings, UserRound, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ClinicData, resetClinic, useClinic } from '@/services/clinic';
import { AppointmentStatus, PatientStatus, RequestStatus } from '@/types';

const NAV = [
  { label: 'Visão geral', href: '/app', icon: LayoutDashboard },
  { label: 'Solicitações', href: '/app/solicitacoes', icon: Inbox },
  { label: 'Agenda', href: '/app/agenda', icon: CalendarDays },
  { label: 'Pacientes', href: '/app/pacientes', icon: Users },
  { label: 'Disponibilidade', href: '/app/disponibilidade', icon: Clock3 },
  { label: 'Perfil profissional', href: '/app/perfil', icon: UserRound },
  { label: 'Meu link', href: '/app/meu-link', icon: Link2 },
  { label: 'Assinatura', href: '/app/configuracoes/assinatura', icon: CreditCard },
  { label: 'Conta', href: '/app/configuracoes', icon: Settings },
];

export const REQUEST_LABELS: Record<RequestStatus, string> = { pending: 'Aguardando você', confirmed: 'Triagem marcada', declined: 'Recusada', continued: 'Em acompanhamento', not_continued: 'Não seguiu' };
export const PATIENT_LABELS: Record<PatientStatus, string> = { active: 'Em acompanhamento', paused: 'Pausado', discharged: 'Alta' };
export const APPOINTMENT_LABELS: Record<AppointmentStatus, string> = { scheduled: 'Marcada', done: 'Realizada', missed: 'Falta', canceled: 'Cancelada' };

export function Badge({ tone, children }: { tone: string; children: ReactNode }) { return <span className={`badge badge-${tone}`}>{children}</span>; }
export function Block({ title, action, children, className = '' }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`block ${className}`}><div className="block-head"><h2>{title}</h2>{action}</div>{children}</section>;
}
export function PageTitle({ eyebrow, title, text, children }: { eyebrow: string; title: ReactNode; text?: ReactNode; children?: ReactNode }) {
  return <div className="page-title"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{text && <p>{text}</p>}</div>{children && <div className="title-actions">{children}</div>}</div>;
}
export const initials = (name: string) => name.split(' ').filter(Boolean).map(x => x[0]).join('').slice(0, 2).toUpperCase();

/**
 * Moldura do painel. Com Supabase configurado exige sessão; sem ele roda em
 * modo demonstração, com os dados guardados só neste navegador.
 */
export function PanelShell({ children }: { children: (data: ClinicData, update: ReturnType<typeof useClinic>['update']) => ReactNode }) {
  const pathname = usePathname();
  const { data, update } = useClinic();
  const [auth, setAuth] = useState<'checking' | 'demo' | 'ok'>('checking');
  useEffect(() => {
    if (!supabase) { setAuth('demo'); return; }
    supabase.auth.getUser().then(({ data: { user } }) => { if (!user) window.location.href = '/login'; else setAuth('ok'); });
  }, []);
  if (auth === 'checking' || !data) return <main className="app-loading">Carregando…</main>;
  const pending = data.requests.filter(r => r.status === 'pending').length;
  const normalized = pathname.replace(/\/$/, '') || '/app';
  return <div className="app-shell">
    <aside className="sidebar">
      <nav>{NAV.map(({ label, href, icon: Icon }) => {
        const active = href === '/app' ? normalized === '/app' : href === '/app/configuracoes' ? normalized === href : normalized.startsWith(href);
        return <Link key={href} href={href} className={active ? 'active' : ''}><Icon size={16} />{label}{href === '/app/solicitacoes' && pending > 0 && <b className="nav-count">{pending}</b>}</Link>;
      })}<a href={`/${data.professional.slug}`} target="_blank" rel="noreferrer" className="nav-public"><ExternalLink size={15} />Página pública</a></nav>
    </aside>
    <main className="portal">
      {auth === 'demo' && <div className="demo-banner">Modo demonstração: os dados ficam salvos apenas neste navegador. <button onClick={() => { if (confirm('Apagar tudo o que foi feito e voltar aos dados de exemplo?')) resetClinic(); }}>Restaurar exemplo</button></div>}
      {children(data, update)}
    </main>
  </div>;
}
