'use client';
import { useEffect, useState } from 'react';
import { ArrowRight, Check, Copy, Download, ExternalLink, Loader2, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { PROFESSIONS } from '@/config/professions';
import { PLANS, PlanId, formatBRL } from '@/config/plans';
import { formatShort, iso, today, WEEKDAYS } from '@/lib/dates';
import { supabase } from '@/lib/supabase';
import { ClinicData, saveProfessional, slugify, useClinic } from '@/services/clinic';
import { ProfessionPicker } from '@/components/ui/profession-picker';
import { Availability, Modality, Professional } from '@/types';
import { Block, PageTitle } from './shell';

type Update = ReturnType<typeof useClinic>['update'];

function SaveButton({ dirty, onSave }: { dirty: boolean; onSave: () => void }) {
  const [saved, setSaved] = useState(false);
  return <button className="primary small" disabled={!dirty && !saved} onClick={() => { onSave(); setSaved(true); setTimeout(() => setSaved(false), 1800); }}>{saved ? <><Check size={14} /> Salvo</> : 'Salvar alterações'}</button>;
}

export function AvailabilityPage({ data, update }: { data: ClinicData; update: Update }) {
  const [value, setValue] = useState<Availability>(data.professional.availability);
  const [block, setBlock] = useState(today());
  const dirty = JSON.stringify(value) !== JSON.stringify(data.professional.availability);
  const setWindow = (weekday: number, patch: Partial<Availability['windows'][number]>) => setValue({ ...value, windows: value.windows.map(w => w.weekday === weekday ? { ...w, ...patch } : w) });
  const ordered = [1, 2, 3, 4, 5, 6, 0].map(i => value.windows.find(w => w.weekday === i)!);
  return <section className="page">
    <PageTitle eyebrow="Agenda" title="Disponibilidade" text="Os horários livres que aparecem no seu link para a triagem.">
      <SaveButton dirty={dirty} onSave={() => update(d => saveProfessional(d, { availability: value }))} />
    </PageTitle>
    <div className="two-cols">
      <Block title="Dias e horários">
        <div className="week-editor">{ordered.map(w => <div key={w.weekday} className={`week-row ${w.enabled ? '' : 'off'}`}>
          <label className="switch"><input type="checkbox" checked={w.enabled} onChange={e => setWindow(w.weekday, { enabled: e.target.checked })} /><i /><span>{WEEKDAYS[w.weekday]}</span></label>
          {w.enabled ? <span className="week-times"><input type="time" value={w.start} onChange={e => setWindow(w.weekday, { start: e.target.value })} aria-label={`Início ${WEEKDAYS[w.weekday]}`} /> às <input type="time" value={w.end} onChange={e => setWindow(w.weekday, { end: e.target.value })} aria-label={`Fim ${WEEKDAYS[w.weekday]}`} /></span> : <span className="muted">Sem atendimento</span>}
        </div>)}</div>
      </Block>
      <div className="stack">
        <Block title="Durações">
          <div className="field-row">
            <label className="field"><span>Triagem (min)</span><select value={value.triageMinutes} onChange={e => setValue({ ...value, triageMinutes: Number(e.target.value) })}>{[20, 30, 40, 45, 50, 60].map(n => <option key={n}>{n}</option>)}</select></label>
            <label className="field"><span>Sessão (min)</span><select value={value.sessionMinutes} onChange={e => setValue({ ...value, sessionMinutes: Number(e.target.value) })}>{[30, 40, 45, 50, 60, 90].map(n => <option key={n}>{n}</option>)}</select></label>
          </div>
        </Block>
        <Block title="Regras do link">
          <div className="field-row">
            <label className="field"><span>Antecedência mínima</span><select value={value.minNoticeHours} onChange={e => setValue({ ...value, minNoticeHours: Number(e.target.value) })}>{[2, 6, 12, 24, 48].map(n => <option key={n} value={n}>{n} horas</option>)}</select></label>
            <label className="field"><span>Mostrar até</span><select value={value.horizonDays} onChange={e => setValue({ ...value, horizonDays: Number(e.target.value) })}>{[7, 14, 30, 60].map(n => <option key={n} value={n}>{n} dias à frente</option>)}</select></label>
          </div>
        </Block>
        <Block title="Folgas e bloqueios">
          <div className="inline-form"><input type="date" min={today()} value={block} onChange={e => setBlock(e.target.value)} /><button className="secondary small" onClick={() => block && !value.blockedDates.includes(block) && setValue({ ...value, blockedDates: [...value.blockedDates, block].sort() })}>Bloquear dia</button></div>
          <div className="chips">{value.blockedDates.filter(d => d >= today()).map(d => <span className="chip on" key={d}>{formatShort(d)}<button aria-label="Desbloquear" onClick={() => setValue({ ...value, blockedDates: value.blockedDates.filter(x => x !== d) })}><X size={12} /></button></span>)}{!value.blockedDates.some(d => d >= today()) && <p className="muted">Nenhum dia bloqueado.</p>}</div>
        </Block>
      </div>
    </div>
  </section>;
}

export function ProfilePage({ data, update }: { data: ClinicData; update: Update }) {
  const [value, setValue] = useState<Professional>(data.professional);
  const dirty = JSON.stringify(value) !== JSON.stringify(data.professional);
  const profession = PROFESSIONS[value.profession];
  return <section className="page">
    <PageTitle eyebrow="Configuração" title="Perfil profissional" text="O que o paciente vê no seu link e as demandas que ele pode escolher.">
      <SaveButton dirty={dirty} onSave={() => update(d => saveProfessional(d, value))} />
    </PageTitle>
    <div className="two-cols">
      <Block title="Área de atuação"><ProfessionPicker value={value} onChange={choice => setValue({ ...value, ...choice })} /></Block>
      <div className="stack">
        <Block title="Apresentação">
          <label className="field"><span>Nome exibido</span><input value={value.name} onChange={e => setValue({ ...value, name: e.target.value })} /></label>
          {profession.council && <label className="field"><span>Registro profissional</span><input value={value.councilNumber ?? ''} onChange={e => setValue({ ...value, councilNumber: e.target.value })} placeholder={`${profession.council} 00/00000`} /></label>}
          <label className="field"><span>Sobre você <small>Aparece no topo do link</small></span><textarea rows={4} value={value.bio ?? ''} onChange={e => setValue({ ...value, bio: e.target.value })} /></label>
        </Block>
        <Block title="Atendimento">
          <label className="field"><span>Modalidade</span><select value={value.modality} onChange={e => setValue({ ...value, modality: e.target.value as Modality })}><option value="ambos">Online e presencial</option><option value="online">Somente online</option><option value="presencial">Somente presencial</option></select></label>
          <label className="field"><span>Cidade</span><input value={value.city ?? ''} onChange={e => setValue({ ...value, city: e.target.value })} /></label>
        </Block>
      </div>
    </div>
  </section>;
}

export function MyLinkPage({ data, update }: { data: ClinicData; update: Update }) {
  const [slug, setSlug] = useState(data.professional.slug);
  const [copied, setCopied] = useState('');
  const [origin, setOrigin] = useState('https://casozero.com.br');
  useEffect(() => setOrigin(window.location.origin), []);
  const url = `${origin}/${data.professional.slug}`;
  const copy = (value: string) => { navigator.clipboard.writeText(value); setCopied(value); setTimeout(() => setCopied(''), 1500); };
  return <section className="page">
    <PageTitle eyebrow="Divulgação" title="Meu link" text="Coloque na bio do Instagram, no WhatsApp ou imprima o QR Code no consultório." />
    <div className="two-cols">
      <Block title="Link público">
        <p className="link-big">{url.replace(/^https?:\/\//, '')}</p>
        <div className="button-row"><button className="primary small" onClick={() => copy(url)}>{copied === url ? <Check size={15} /> : <Copy size={15} />} {copied === url ? 'Copiado' : 'Copiar link'}</button><a className="secondary small" href={`/${data.professional.slug}`} target="_blank" rel="noreferrer"><ExternalLink size={15} /> Abrir</a></div>
        <label className="field"><span>Endereço personalizado</span><div className="inline-form"><span className="muted">{origin.replace(/^https?:\/\//, '')}/</span><input value={slug} onChange={e => setSlug(slugify(e.target.value))} /><button className="secondary small" disabled={slug === data.professional.slug} onClick={() => update(d => saveProfessional(d, { slug }))}>Salvar</button></div></label>
      </Block>
      <Block title="QR Code">
        <div className="qr"><QRCodeSVG value={url} size={176} /></div>
        <button className="secondary small" onClick={() => { const svg = document.querySelector('.qr svg'); if (!svg) return; const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' })); a.download = `qr-${data.professional.slug}.svg`; a.click(); }}><Download size={15} /> Baixar</button>
      </Block>
    </div>
    <Block title="Links por demanda" className="spaced">
      <p className="muted">Cada link já abre com o assunto escolhido. Útil para posts sobre um tema específico.</p>
      <div className="link-list">{data.professional.categories.map(c => { const u = `${url}/${slugify(c)}`; return <div key={c}><span>{c}</span><code>{u.replace(/^https?:\/\//, '')}</code><button className="secondary small" onClick={() => copy(u)}>{copied === u ? <Check size={14} /> : <Copy size={14} />}</button></div>; })}</div>
    </Block>
  </section>;
}

export function AccountPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  useEffect(() => { supabase?.auth.getUser().then(({ data: { user } }) => setEmail(user?.email ?? '')); }, []);
  if (!supabase) return <section className="page"><PageTitle eyebrow="Conta" title="Conta e acesso" text="No modo demonstração não há conta. Configure o Supabase para ativar login e cadastro." /></section>;
  async function sendReset() { setStatus('Enviando…'); const { error } = await supabase!.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/redefinir-senha` }); setStatus(error ? error.message : 'Enviamos um link de redefinição para o seu e-mail.'); }
  async function logout() { await supabase!.auth.signOut(); window.location.href = '/login'; }
  return <section className="page">
    <PageTitle eyebrow="Conta" title="Conta e acesso" />
    <Block title="Acesso"><dl className="facts"><div><dt>E-mail</dt><dd>{email || '—'}</dd></div></dl><div className="button-row"><button className="secondary small" onClick={sendReset}>Redefinir senha</button><button className="ghost-danger small" onClick={logout}>Sair</button></div>{status && <p className="auth-notice">{status}</p>}</Block>
  </section>;
}

export function SubscriptionPage({ data }: { data: ClinicData }) {
  const [current, setCurrent] = useState<PlanId>('caso_zero');
  const [selected, setSelected] = useState<PlanId>();
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  useEffect(() => { (async () => {
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser(); if (!user) return;
    const { data: row } = await supabase.from('subscriptions').select('plan_id').eq('user_id', user.id).eq('status', 'active').order('updated_at', { ascending: false }).limit(1).maybeSingle();
    if (row?.plan_id && row.plan_id in PLANS) setCurrent(row.plan_id as PlanId);
  })(); }, []);
  const month = today().slice(0, 7);
  const used = data.requests.filter(r => iso(new Date(r.createdAt)).slice(0, 7) === month).length;
  const plan = PLANS[current];
  const percent = Math.min(100, Math.round(used / plan.monthlyTriages * 100));
  async function checkout() {
    if (!selected || selected === 'caso_zero') return;
    if (!supabase) { setNotice('O checkout precisa do Supabase e da Stripe configurados.'); return; }
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch('/api/stripe/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` }, body: JSON.stringify({ plan: selected }) });
    const result = await response.json();
    if (result.url) window.location.href = result.url; else { setNotice(result.error || 'Não foi possível abrir o checkout.'); setLoading(false); }
  }
  return <section className="page">
    <PageTitle eyebrow="Conta" title="Assinatura" text="Seu plano conta as novas triagens recebidas no mês." />
    <div className="two-cols">
      <Block title={`Plano ${plan.name}`}><p className="big-number">{formatBRL(plan.price)}<small>/mês</small></p><p className="muted">{plan.description}</p></Block>
      <Block title="Uso neste mês"><p className="big-number">{used}<small> de {plan.monthlyTriages} triagens</small></p><div className="usage-bar"><i style={{ width: `${percent}%` }} /></div></Block>
    </div>
    <Block title="Trocar de plano" className="spaced">
      <div className="plan-options">{Object.values(PLANS).filter(p => p.id !== current).map(p => <button key={p.id} className={selected === p.id ? 'on' : ''} onClick={() => setSelected(p.id)}><strong>{p.name}</strong><span>{formatBRL(p.price)}/mês</span><small>{p.monthlyTriages} triagens · {p.maxProfessionals} profissional(is)</small></button>)}</div>
      {selected && selected !== 'caso_zero' && <button className="primary" disabled={loading} onClick={checkout}>{loading ? <><Loader2 size={15} className="spin" /> Abrindo Stripe…</> : <>Assinar {PLANS[selected].name} <ArrowRight size={15} /></>}</button>}
      {notice && <p className="auth-notice">{notice}</p>}
    </Block>
  </section>;
}
