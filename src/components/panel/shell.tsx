'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import { CalendarDays, Check, Clock3, CreditCard, ExternalLink, Inbox, LayoutDashboard, Link2, Menu, PanelsTopLeft, Settings, Sparkles, UserRound, Users, UsersRound, X } from 'lucide-react';
import { formatBRL, PLANS } from '@/config/plans';
import { PROFESSIONS } from '@/config/professions';
import { supabase } from '@/lib/supabase';
import { ClinicData, flushClinic, markWelcomeSeen, resetClinic, setClinicOwner, setViewAs, SYNC_ERROR_EVENT, useClinic, viewingAsSecretary } from '@/services/clinic';
import { Avatar } from '@/components/public/profile';
import { AppointmentStatus, PatientStatus, RequestStatus } from '@/types';
import { BrandLockup } from '@/components/ui/brand';

const NAV: { group: string; items: { label: string; href: string; icon: typeof Inbox }[] }[] = [
  { group: 'Atendimento', items: [
    { label: 'Visão geral', href: '/app', icon: LayoutDashboard },
    { label: 'Solicitações', href: '/app/solicitacoes', icon: Inbox },
    { label: 'Agenda', href: '/app/agenda', icon: CalendarDays },
    { label: 'Pacientes', href: '/app/pacientes', icon: Users },
  ] },
  { group: 'Configuração', items: [
    { label: 'Disponibilidade', href: '/app/disponibilidade', icon: Clock3 },
    { label: 'Página pública', href: '/app/pagina', icon: PanelsTopLeft },
    { label: 'Perfil profissional', href: '/app/perfil', icon: UserRound },
    { label: 'Meu link', href: '/app/meu-link', icon: Link2 },
  ] },
  { group: 'Conta', items: [
    { label: 'Assinatura', href: '/app/configuracoes/assinatura', icon: CreditCard },
    { label: 'Conta', href: '/app/configuracoes', icon: Settings },
  ] },
];

export const REQUEST_LABELS: Record<RequestStatus, string> = { pending: 'Aguardando você', proposed: 'Horário sugerido', awaiting_payment: 'Aguardando pagamento', confirmed: 'Triagem marcada', declined: 'Recusada', continued: 'Em acompanhamento', not_continued: 'Não seguiu' };
export const PATIENT_LABELS: Record<PatientStatus, string> = { active: 'Em acompanhamento', paused: 'Pausado', discharged: 'Alta' };
export const APPOINTMENT_LABELS: Record<AppointmentStatus, string> = { scheduled: 'Marcada', done: 'Realizada', missed: 'Falta', canceled: 'Cancelada' };

export function Badge({ tone, children }: { tone: string; children: ReactNode }) { return <span className={`badge badge-${tone}`}>{children}</span>; }
export function Block({ title, action, children, className = '' }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`block ${className}`}><div className="block-head"><h2>{title}</h2>{action}</div>{children}</section>;
}
export function PageTitle({ eyebrow, title, text, children }: { eyebrow: string; title: ReactNode; text?: ReactNode; children?: ReactNode }) {
  return <div className="page-title"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{text && <p>{text}</p>}</div>{children && <div className="title-actions">{children}</div>}</div>;
}
export function FormError({ message }: { message?: string }) { return message ? <p className="form-error">{message}</p> : null; }
export const initials = (name: string) => name.split(' ').filter(Boolean).map(x => x[0]).join('').slice(0, 2).toUpperCase();

/**
 * Moldura do painel com menu lateral. Com Supabase configurado exige sessão;
 * sem ele roda em modo demonstração, com os dados guardados só neste navegador.
 */
export function PanelShell({ children }: { children: (data: ClinicData, update: ReturnType<typeof useClinic>['update']) => ReactNode }) {
  const pathname = usePathname();
  const { data, update } = useClinic();
  const [auth, setAuth] = useState<'checking' | 'demo' | 'ok'>('checking');
  const [open, setOpen] = useState(false);
  const [syncError, setSyncError] = useState('');
  useEffect(() => {
    const onError = (e: Event) => setSyncError((e as CustomEvent<string>).detail);
    window.addEventListener(SYNC_ERROR_EVENT, onError);
    return () => window.removeEventListener(SYNC_ERROR_EVENT, onError);
  }, []);
  useEffect(() => {
    if (!supabase) { setAuth('demo'); return; }
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { window.location.href = '/login'; return; }
      // Cada conta usa os próprios dados; uma conta nova começa vazia.
      setClinicOwner({ id: user.id, email: user.email, metadata: user.user_metadata ?? {} });
      setAuth('ok');
    });
  }, []);
  useEffect(() => setOpen(false), [pathname]);
  if (auth === 'checking' || !data) return <main className="app-loading">{syncError ? <span className="load-error">{syncError} <button onClick={() => window.location.reload()}>Tentar de novo</button></span> : 'Carregando…'}</main>;
  const pending = data.requests.filter(r => r.status === 'pending').length;
  const normalized = pathname.replace(/\/$/, '') || '/app';
  const isActive = (href: string) => href === '/app' || href === '/app/configuracoes' ? normalized === href : normalized.startsWith(href);
  const pro = data.professional;
  const secretary = viewingAsSecretary(data) ? data.team.find(m => m.id === data.viewAs) : undefined;
  // Secretária: só a agenda. Equipe: só no plano Clínica.
  const nav = secretary
    ? [{ group: 'Clínica', items: [{ label: 'Agenda', href: '/app/agenda', icon: CalendarDays }] }]
    : NAV.map(section => section.group === 'Conta' && PLANS[data.plan].team ? { ...section, items: [{ label: 'Equipe', href: '/app/equipe', icon: UsersRound }, ...section.items] } : section);
  const blocked = secretary && normalized !== '/app/agenda';
  return <div className="panel-layout">
    <header className="panel-mobilebar"><button onClick={() => setOpen(true)} aria-label="Abrir menu"><Menu size={20} /></button><span className="panel-brand brand-lockup"><BrandLockup/></span>{!secretary && pending > 0 && <Link href="/app/solicitacoes" className="nav-count">{pending}</Link>}</header>
    {open && <div className="panel-scrim" onClick={() => setOpen(false)} />}
    <aside className={`panel-side ${open ? 'open' : ''}`}>
      <div className="panel-side-top"><Link href={secretary ? '/app/agenda' : '/app'} className="panel-brand brand-lockup" aria-label="CasoZero"><BrandLockup/></Link><button className="panel-close" onClick={() => setOpen(false)} aria-label="Fechar menu"><X size={18} /></button></div>
      {secretary
        ? <div className="panel-pro"><span className="initials">{initials(secretary.name)}</span><span><strong>{secretary.name}</strong><small>Secretária · acesso à agenda</small></span></div>
        : <div className="panel-pro"><Avatar professional={pro} size={36} /><span><strong>{pro.name}</strong><small>{PROFESSIONS[pro.profession].label}</small></span></div>}
      <nav>{nav.map(section => <div key={section.group} className="panel-nav-group"><p>{section.group}</p>{section.items.map(({ label, href, icon: Icon }) =>
        <Link key={href} href={href} className={isActive(href) ? 'active' : ''}><Icon size={17} /><span>{label}</span>{href === '/app/solicitacoes' && pending > 0 && <b className="nav-count">{pending}</b>}</Link>)}</div>)}</nav>
      {!secretary && <a href={`/${pro.slug}`} target="_blank" rel="noreferrer" className="panel-public"><ExternalLink size={15} /> Ver minha página</a>}
    </aside>
    <main className="panel-main">
      {auth === 'demo' && <div className="demo-banner">Modo demonstração: os dados ficam salvos apenas neste navegador. <button onClick={() => { if (confirm('Apagar tudo o que foi feito e voltar aos dados de exemplo?')) resetClinic(); }}>Restaurar exemplo</button></div>}
      {syncError && <div className="sync-error" role="alert">{syncError} <button onClick={() => setSyncError('')} aria-label="Fechar aviso"><X size={14} /></button></div>}
      {secretary && <div className="viewas-banner">Você está vendo o painel como <b>{secretary.name}</b> (secretária): só a agenda, sem caderneta. <button onClick={async () => { update(d => setViewAs(d, undefined)); await flushClinic(); window.location.href = '/app/equipe'; }}>Voltar ao painel de {pro.name.split(' ')[0]}</button></div>}
      {blocked
        ? <section className="page empty"><h1>Acesso restrito</h1><p className="muted">A secretária acessa apenas a agenda.</p><Link className="primary small" href="/app/agenda">Abrir agenda</Link></section>
        : children(data, update)}
    </main>
    {auth === 'ok' && !secretary && data.plan === 'gratis' && data.welcomeSeen === false && <WelcomeFree close={() => update(d => markWelcomeSeen(d))} name={pro.name} />}
  </div>;
}

/** Primeiro acesso de uma conta real: explica o plano Grátis e o limite de pacientes. */
function WelcomeFree({ name, close }: { name: string; close: () => void }) {
  const free = PLANS.gratis;
  const pro = PLANS.profissional;
  return <div className="modal" role="dialog" aria-modal="true" aria-label="Boas-vindas">
    <div className="modal-card welcome-card">
      <div className="welcome-icon"><Sparkles size={22} /></div>
      <p className="eyebrow">Plano Gratuito</p>
      <h2>Boas-vindas ao CasoZero, {name.split(' ')[0]}!</h2>
      <p>Sua conta está no <b>plano Gratuito</b>, com todos os recursos liberados para <b>até {free.maxPatients} pacientes cadastrados</b>.</p>
      <ul className="welcome-list">
        <li><Check size={15} /> Página pública e agendamento de triagem</li>
        <li><Check size={15} /> Agenda, horários fixos e caderneta de sessões</li>
        <li><Check size={15} /> Evolução de cada paciente</li>
      </ul>
      <p className="welcome-limit">Ao chegar a {free.maxPatients} pacientes, para cadastrar novos você assina o <b>plano {pro.name}</b> por <b>{formatBRL(pro.price)}/mês</b>, sem limite de pacientes.</p>
      <div className="welcome-actions">
        <button className="primary" onClick={close}>Começar a usar</button>
        <Link className="secondary" href="/app/configuracoes/assinatura" onClick={close}>Ver o plano {pro.name}</Link>
      </div>
    </div>
  </div>;
}
