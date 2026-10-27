'use client';
import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { ExternalLink, LogOut, MailCheck, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { PLANS, toPlanId } from '@/config/plans';
import { PROFESSIONS, ProfessionId } from '@/config/professions';
import { supabase } from '@/lib/supabase';
import { BrandLockup } from '@/components/ui/brand';
import { FormError } from '@/components/panel/shell';

/** Uma conta como o banco devolve em admin_overview (dos pacientes, só contagens). */
interface AdminRow {
  id: string; email: string; name: string; profession: ProfessionId | null; slug: string | null;
  createdAt: string; lastSignInAt: string | null; emailConfirmed: boolean; hasProfile: boolean; hasPhoto: boolean;
  services: number; openDays: number; requests: number; lastRequestAt: string | null; patients: number; sessionsDone: number;
  plan: string | null; planStatus: string | null; complimentary: boolean; isAdmin: boolean;
}

const DAY = 86_400_000;
const FREE_LIMIT = PLANS.gratis.maxPatients ?? 5;
const isPaid = (r: AdminRow) => r.planStatus === 'active' && (toPlanId(r.plan) ?? 'gratis') !== 'gratis';

/** O que pode estar travando cada conta; a ordem é a dos filtros. */
const ISSUES: { id: string; label: string; test: (r: AdminRow, now: number) => boolean }[] = [
  { id: 'email', label: 'E-mail não confirmado (+24h)', test: (r, now) => !r.emailConfirmed && now - Date.parse(r.createdAt) > DAY },
  { id: 'profile', label: 'Cadastro sem perfil', test: r => r.emailConfirmed && !r.hasProfile },
  { id: 'hours', label: 'Sem horários', test: r => r.hasProfile && r.openDays === 0 },
  { id: 'services', label: 'Sem serviços', test: r => r.hasProfile && r.services === 0 },
  { id: 'requests', label: 'Nenhuma solicitação', test: r => r.hasProfile && r.requests === 0 },
  { id: 'full', label: 'Grátis esgotado sem assinatura', test: r => !isPaid(r) && r.patients >= FREE_LIMIT },
  { id: 'pastdue', label: 'Pagamento falhou', test: r => r.planStatus === 'past_due' },
  { id: 'idle', label: 'Sem acesso há +14 dias', test: (r, now) => !r.lastSignInAt || now - Date.parse(r.lastSignInAt) > 14 * DAY },
];

/** Etapas do funil, de quem só criou a conta até quem paga. */
const FUNNEL: { label: string; test: (r: AdminRow) => boolean }[] = [
  { label: 'Cadastros', test: () => true },
  { label: 'E-mail confirmado', test: r => r.emailConfirmed },
  { label: 'Perfil criado', test: r => r.hasProfile },
  { label: 'Horários configurados', test: r => r.openDays > 0 },
  { label: 'Primeira solicitação', test: r => r.requests > 0 },
  { label: 'Primeiro paciente', test: r => r.patients > 0 },
  { label: `${FREE_LIMIT} pacientes`, test: r => r.patients >= FREE_LIMIT },
  { label: 'Assinatura paga', test: r => isPaid(r) && !r.complimentary },
];

const shortDate = (value: string | null) => value ? new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—';
const shortStamp = (value: string | null) => value ? new Date(value).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Nunca';

function planText(r: AdminRow) {
  if (r.planStatus === 'past_due') return 'Pagamento falhou';
  if (!isPaid(r)) return r.planStatus === 'canceled' ? 'Grátis (cancelada)' : 'Grátis';
  const name = PLANS[toPlanId(r.plan) ?? 'gratis'].name;
  return r.complimentary ? `${name} (cortesia)` : name;
}

type Gate = 'loading' | 'demo' | 'signin' | 'denied' | 'enroll' | 'verify' | 'ready';
interface Enrollment { factorId: string; qr: string; secret: string }

/**
 * Painel da plataforma, só leitura. O banco só entrega os dados para quem está
 * em platform_admins e confirmou o código do autenticador nesta sessão (aal2).
 */
export function AdminPanel() {
  const [gate, setGate] = useState<Gate>('loading');
  const [factorId, setFactorId] = useState('');
  const [enrollment, setEnrollment] = useState<Enrollment>();
  const [rows, setRows] = useState<AdminRow[]>([]);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!supabase) return;
    const { data, error } = await supabase.rpc('admin_overview');
    if (error) { setError(/CODIGO_NECESSARIO/.test(error.message) ? 'Confirme o código do autenticador.' : 'Não foi possível carregar os dados.'); return; }
    setError(''); setRows(data as AdminRow[]); setGate('ready');
  }, []);

  const start = useCallback(async () => {
    if (!supabase) { setGate('demo'); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setGate('signin'); return; }
    const { data: admin } = await supabase.rpc('is_platform_admin');
    if (admin !== true) { setGate('denied'); return; }
    const { data: level } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (level?.currentLevel === 'aal2') { await load(); return; }
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const verified = factors?.totp.find(f => f.status === 'verified');
    if (verified) { setFactorId(verified.id); setGate('verify'); return; }
    // Primeiro acesso: descarta tentativas de cadastro não concluídas e gera um QR code novo.
    for (const f of factors?.all ?? []) if (f.factor_type === 'totp' && f.status === 'unverified') await supabase.auth.mfa.unenroll({ factorId: f.id });
    const { data: enrolled, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'CasoZero admin', issuer: 'CasoZero' });
    if (error || !enrolled) { setError('Não foi possível gerar o QR code do autenticador.'); setGate('enroll'); return; }
    setFactorId(enrolled.id);
    setEnrollment({ factorId: enrolled.id, qr: enrolled.totp.qr_code, secret: enrolled.totp.secret });
    setGate('enroll');
  }, [load]);

  useEffect(() => { void start(); }, [start]);

  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    const code = String(new FormData(event.currentTarget).get('code') ?? '').replace(/\D/g, '');
    if (code.length !== 6) { setError('Digite os 6 números do autenticador.'); return; }
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
    if (error) { setError('Código inválido ou expirado. Confira o horário do celular e tente o código novo.'); return; }
    setEnrollment(undefined);
    await load();
  }

  async function signOut() { await supabase?.auth.signOut(); window.location.href = '/login'; }

  return <main className="admin-page">
    <header className="admin-top">
      <Link href="/" className="brand-lockup" aria-label="CasoZero"><BrandLockup /></Link>
      {gate !== 'loading' && gate !== 'demo' && gate !== 'signin' && <button className="secondary small" onClick={signOut}><LogOut size={14} /> Sair</button>}
    </header>
    {gate === 'loading' && <p className="muted">Carregando…</p>}
    {gate === 'demo' && <AdminNotice title="Painel de admin">Disponível só com o Supabase configurado.</AdminNotice>}
    {gate === 'signin' && <AdminNotice title="Entre para continuar">O painel da plataforma é só para administradores. <Link className="text-link" href="/login?next=/admin">Entrar</Link></AdminNotice>}
    {gate === 'denied' && <AdminNotice title="Sem acesso">Esta conta não é administradora da plataforma. <Link className="text-link" href="/app">Ir para o painel</Link></AdminNotice>}
    {(gate === 'enroll' || gate === 'verify') && <section className="admin-gate block">
      <ShieldCheck size={28} />
      <h1>{gate === 'enroll' ? 'Ative o autenticador' : 'Código do autenticador'}</h1>
      {gate === 'enroll' && enrollment && <>
        <p className="muted">No Google Authenticator, toque em <b>+</b> e escaneie o QR code. A conta vai aparecer como <b>CasoZero</b>. Depois digite o código de 6 números.</p>
        {/* O QR vem do Supabase como imagem SVG em data URL. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="admin-qr" src={enrollment.qr} alt="QR code para o autenticador" width={200} height={200} />
        <p className="muted small-print">Sem câmera? Use a chave: <code>{enrollment.secret}</code></p>
      </>}
      {gate === 'verify' && <p className="muted">Abra o Google Authenticator e digite o código de 6 números da conta <b>CasoZero</b>.</p>}
      <form onSubmit={verify} className="admin-code">
        <input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]*" maxLength={7} placeholder="000000" autoFocus aria-label="Código de 6 números" />
        <button className="primary">Confirmar</button>
      </form>
      <FormError message={error} />
    </section>}
    {gate === 'ready' && <Overview rows={rows} reload={load} error={error} />}
  </main>;
}

function AdminNotice({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="admin-gate block"><h1>{title}</h1><p className="muted">{children}</p></section>;
}

function Overview({ rows, reload, error }: { rows: AdminRow[]; reload: () => Promise<void>; error: string }) {
  const [issue, setIssue] = useState('all');
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [now] = useState(() => Date.now());
  const issuesOf = useMemo(() => new Map(rows.map(r => [r.id, ISSUES.filter(i => i.test(r, now))])), [rows, now]);
  const q = query.trim().toLowerCase();
  const visible = rows.filter(r => (issue === 'all' || issuesOf.get(r.id)?.some(i => i.id === issue))
    && (!q || `${r.name} ${r.email} ${r.slug ?? ''}`.toLowerCase().includes(q)));
  const percent = (n: number) => rows.length ? `${Math.round((n / rows.length) * 100)}% dos cadastros` : '—';

  return <section className="page admin-overview">
    <div className="page-title"><div>
      <p className="eyebrow">Somente leitura</p>
      <h1>Painel da plataforma</h1>
      <p>Profissionais cadastradas e onde cada uma parou. Dos pacientes aparecem só números.</p>
    </div><div className="title-actions"><button className="secondary small" disabled={refreshing} onClick={async () => { setRefreshing(true); await reload(); setRefreshing(false); }}><RefreshCw size={14} /> Atualizar</button></div></div>
    <FormError message={error} />

    <div className="metrics admin-metrics">{FUNNEL.map(step => { const n = rows.filter(step.test).length; return <div className="metric" key={step.label}><span>{step.label}</span><strong>{n}</strong><p>{percent(n)}</p></div>; })}</div>

    <section className="block">
      <div className="block-head"><h2>Pendências</h2></div>
      <div className="chips">
        <button className={`chip ${issue === 'all' ? 'on' : ''}`} onClick={() => setIssue('all')}>Todas ({rows.length})</button>
        {ISSUES.map(i => { const n = rows.filter(r => issuesOf.get(r.id)?.some(x => x.id === i.id)).length; return <button key={i.id} className={`chip ${issue === i.id ? 'on' : ''}`} onClick={() => setIssue(i.id)}>{i.label} ({n})</button>; })}
      </div>
      <label className="search admin-search"><Search size={15} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar por nome, e-mail ou link" /></label>
    </section>

    <section className="block">
      <div className="block-head"><h2>Profissionais ({visible.length})</h2></div>
      <div className="report-table-wrap"><table className="report-table admin-table">
        <thead><tr><th>Profissional</th><th>Página</th><th>Cadastro</th><th>Último acesso</th><th>E-mail</th><th>Configuração</th><th>Pacientes</th><th>Assinatura</th><th>Solicitações</th><th>Pendências</th><th>Ações</th></tr></thead>
        <tbody>{visible.map(r => { const issues = issuesOf.get(r.id) ?? []; return <tr key={r.id}>
          <td><strong>{r.name || '—'}</strong>{r.isAdmin && <span className="admin-tag">admin</span>}<small>{r.email}</small>{r.profession && <small>{PROFESSIONS[r.profession]?.label ?? r.profession}</small>}</td>
          <td>{r.slug ? `/${r.slug}` : '—'}</td>
          <td>{shortDate(r.createdAt)}</td>
          <td>{shortStamp(r.lastSignInAt)}</td>
          <td>{r.emailConfirmed ? 'Confirmado' : 'Pendente'}</td>
          <td>{r.hasProfile ? <>{r.services} serviço(s) · {r.openDays} dia(s)<small>{r.hasPhoto ? 'Com foto' : 'Sem foto'}</small></> : 'Só conta criada'}</td>
          <td>{isPaid(r) ? r.patients : `${r.patients}/${FREE_LIMIT}`}<small>{r.sessionsDone} sessão(ões) feitas</small></td>
          <td>{planText(r)}</td>
          <td>{r.requests}<small>{r.lastRequestAt ? `última ${shortDate(r.lastRequestAt)}` : 'nenhuma'}</small></td>
          <td>{issues.length ? <div className="admin-issues">{issues.map(i => <span key={i.id}>{i.label}</span>)}</div> : '—'}</td>
          <td>{r.slug && r.hasProfile && <a className="text-link" href={`/${r.slug}`} target="_blank" rel="noreferrer">Abrir página <ExternalLink size={12} /></a>}
            {!r.emailConfirmed && <ResendButton email={r.email} />}</td>
        </tr>; })}</tbody>
      </table></div>
      {!visible.length && <p className="muted empty-list">Nenhuma conta neste filtro.</p>}
    </section>
  </section>;
}

/** Reenvia o e-mail de confirmação do cadastro para a profissional. */
function ResendButton({ email }: { email: string }) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  async function send() {
    if (!supabase) return;
    setStatus('sending');
    const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: `${window.location.origin}/cadastro/confirmado` } });
    setStatus(error ? 'error' : 'sent');
  }
  return <button className="text-link" disabled={status === 'sending' || status === 'sent'} onClick={send}><MailCheck size={12} /> {status === 'sent' ? 'Reenviado' : status === 'error' ? 'Falhou, tentar de novo' : 'Reenviar confirmação'}</button>;
}
