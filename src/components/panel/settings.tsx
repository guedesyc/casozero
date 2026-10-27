'use client';
import Link from 'next/link';
import { ChangeEvent, useEffect, useState } from 'react';
import { ArrowRight, Check, Copy, Download, ExternalLink, Eye, ImagePlus, Loader2, LogOut, Plus, Printer, Trash2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { PROFESSION_LIST, PROFESSIONS, ProfessionId } from '@/config/professions';
import { PLANS, PlanId, formatBRL, formatMoney, priceLabel, toPlanId } from '@/config/plans';
import { MIN_CLINIC_SEATS } from '@/config/stripe';
import { formatShort, formatStamp, iso, today, WEEKDAYS } from '@/lib/dates';
import { supabase } from '@/lib/supabase';
import { ClinicData, flushClinic, resetClinic, saveAccount, saveProfessional, saveTeam, setClinicOwner, setPlan, setViewAs, slugify, slugifyTopic, uid, useClinic } from '@/services/clinic';
import { ProfessionPicker } from '@/components/ui/profession-picker';
import { isSlugAvailable } from '@/services/remote';
import { Avatar } from '@/components/public/profile';
import { AccountSettings, Availability, Modality, Professional, Service, TeamMember, TeamRole, TimeBlock } from '@/types';
import { Block, FormError, PageTitle, PATIENT_LABELS } from './shell';

type Update = ReturnType<typeof useClinic>['update'];

const RESERVED_SLUGS = new Set(['app','api','admin','login','logout','entrar','sair','cadastro','cadastrar','precos','planos','conta','configuracoes','ajuda','suporte','contato','termos','privacidade','sobre','blog','static','public','assets','casozero','www','agendar','pagina','perfil','equipe','pacientes','agenda','solicitacoes','disponibilidade']);

/** Salva e mostra “Salvo” ou o erro devolvido pela operação. */
function SaveButton({ dirty, onSave }: { dirty: boolean; onSave: () => string | void }) {
  const [state, setState] = useState<'idle' | 'saved'>('idle');
  const [error, setError] = useState('');
  return <span className="save-wrap">
    <button className="primary small" disabled={!dirty && state !== 'saved'} onClick={() => { const err = onSave(); if (err) { setError(err); return; } setError(''); setState('saved'); setTimeout(() => setState('idle'), 1800); }}>{state === 'saved' ? <><Check size={14} /> Salvo</> : 'Salvar alterações'}</button>
    {error && <small className="form-error inline">{error}</small>}
  </span>;
}
const saveWith = (update: Update, change: (d: ClinicData) => void) => () => { const result = update(d => { change(d); return {} as { error?: string }; }); return result.error; };

/* ------------------------------------------------------------------ */
/* Disponibilidade                                                     */
/* ------------------------------------------------------------------ */

export function AvailabilityPage({ data, update }: { data: ClinicData; update: Update }) {
  const [value, setValue] = useState<Availability>(data.professional.availability);
  const dirty = JSON.stringify(value) !== JSON.stringify(data.professional.availability);
  const setWindow = (weekday: number, patch: Partial<Availability['windows'][number]>) => setValue({ ...value, windows: value.windows.map(w => w.weekday === weekday ? { ...w, ...patch } : w) });
  const setBlock = (id: string, patch: Partial<TimeBlock>) => setValue({ ...value, blocks: value.blocks.map(b => b.id === id ? { ...b, ...patch } : b) });
  const addBlock = () => setValue({ ...value, blocks: [...value.blocks, { id: uid(), date: today(), allDay: false, start: '12:00', end: '14:00' }] });
  const ordered = [1, 2, 3, 4, 5, 6, 0].map(i => value.windows.find(w => w.weekday === i)!);
  const upcoming = value.blocks.filter(b => b.date >= today()).sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`));
  const invalid = upcoming.some(b => !b.allDay && b.start >= b.end) || ordered.some(w => w.enabled && w.start >= w.end);
  return <section className="page">
    <PageTitle eyebrow="Agenda" title="Disponibilidade" text="Os horários livres que aparecem no seu link para a triagem.">
      <SaveButton dirty={dirty && !invalid} onSave={saveWith(update, d => saveProfessional(d, { availability: value }))} />
    </PageTitle>
    {invalid && <FormError message="Há um horário com início depois do fim. Corrija antes de salvar." />}
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
      </div>
    </div>
    <Block title="Folgas e bloqueios" className="spaced" action={<button className="secondary small" onClick={addBlock}><Plus size={14} /> Adicionar bloqueio</button>}>
      <p className="muted">Bloqueie um dia inteiro ou só um intervalo (almoço, consulta médica, curso). Esses horários somem do link e não aceitam marcações.</p>
      {upcoming.length ? <div className="block-list">{upcoming.map(b => <div key={b.id} className="block-row">
        <label className="field"><span>Dia</span><input type="date" min={today()} value={b.date} onChange={e => setBlock(b.id, { date: e.target.value })} /></label>
        <label className="inline-check"><input type="checkbox" checked={b.allDay} onChange={e => setBlock(b.id, { allDay: e.target.checked })} /> Dia inteiro</label>
        <label className="field"><span>Início</span><input type="time" disabled={b.allDay} value={b.start} onChange={e => setBlock(b.id, { start: e.target.value })} /></label>
        <label className="field"><span>Fim</span><input type="time" disabled={b.allDay} value={b.end} onChange={e => setBlock(b.id, { end: e.target.value })} /></label>
        <label className="field grow"><span>Motivo <small>Opcional, só você vê</small></span><input value={b.reason ?? ''} onChange={e => setBlock(b.id, { reason: e.target.value })} placeholder="Ex.: congresso" /></label>
        <button className="icon-button" aria-label="Remover bloqueio" onClick={() => setValue({ ...value, blocks: value.blocks.filter(x => x.id !== b.id) })}><Trash2 size={15} /></button>
      </div>)}</div> : <p className="muted">Nenhum bloqueio futuro.</p>}
    </Block>
  </section>;
}

/* ------------------------------------------------------------------ */
/* Perfil profissional (área de atuação)                               */
/* ------------------------------------------------------------------ */

export function ProfilePage({ data, update }: { data: ClinicData; update: Update }) {
  const [value, setValue] = useState<Professional>(data.professional);
  const dirty = JSON.stringify(value) !== JSON.stringify(data.professional);
  const profession = PROFESSIONS[value.profession];
  return <section className="page">
    <PageTitle eyebrow="Configuração" title="Perfil profissional" text="Sua área, abordagem e as demandas que o paciente pode escolher.">
      <SaveButton dirty={dirty} onSave={saveWith(update, d => saveProfessional(d, value))} />
    </PageTitle>
    <div className="two-cols">
      <Block title="Área de atuação"><ProfessionPicker value={value} onChange={choice => setValue({ ...value, ...choice })} /></Block>
      <div className="stack">
        <Block title="Identificação">
          <label className="field"><span>Nome exibido</span><input value={value.name} onChange={e => setValue({ ...value, name: e.target.value })} /></label>
          {profession.council && <label className="field"><span>Registro profissional</span><input value={value.councilNumber ?? ''} onChange={e => setValue({ ...value, councilNumber: e.target.value })} placeholder={`${profession.council} 00/00000`} /></label>}
        </Block>
        <Block title="Atendimento">
          <label className="field"><span>Modalidade</span><select value={value.modality} onChange={e => setValue({ ...value, modality: e.target.value as Modality })}><option value="ambos">Online e presencial</option><option value="online">Somente online</option><option value="presencial">Somente presencial</option></select></label>
          <label className="field"><span>Cidade</span><input value={value.city ?? ''} onChange={e => setValue({ ...value, city: e.target.value })} /></label>
        </Block>
      </div>
    </div>
  </section>;
}

/* ------------------------------------------------------------------ */
/* Página pública                                                      */
/* ------------------------------------------------------------------ */

/** Lê uma imagem e reduz no navegador para caber no armazenamento local. */
function readImage(file: File, maxWidth: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(img.src);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export function PublicPageEditor({ data, update }: { data: ClinicData; update: Update }) {
  const [value, setValue] = useState<Professional>(data.professional);
  const dirty = JSON.stringify(value) !== JSON.stringify(data.professional);
  const pick = (field: 'photo' | 'cover', width: number) => async (e: ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) setValue({ ...value, [field]: await readImage(file, width) }); e.target.value = ''; };
  const setService = (id: string, patch: Partial<Service>) => setValue({ ...value, services: value.services.map(s => s.id === id ? { ...s, ...patch } : s) });
  return <section className="page">
    <PageTitle eyebrow="Divulgação" title="Página pública" text="Sua vitrine. É o que o paciente vê antes de clicar em “Marcar consulta!”.">
      <a className="secondary small" href={`/${data.professional.slug}`} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Ver página</a>
      <SaveButton dirty={dirty} onSave={saveWith(update, d => saveProfessional(d, value))} />
    </PageTitle>
    <Block title="Foto e capa">
      <div className="media-editor">
        <div className={`cover-preview ${value.cover ? '' : 'empty'}`} style={value.cover ? { backgroundImage: `url(${value.cover})` } : undefined}>
          <span className="media-actions"><label className="secondary small"><ImagePlus size={14} /> {value.cover ? 'Trocar capa' : 'Adicionar capa'}<input type="file" accept="image/*" onChange={pick('cover', 1600)} hidden /></label>{value.cover && <button className="secondary small" onClick={() => setValue({ ...value, cover: undefined })}>Remover</button>}</span>
        </div>
        <div className="photo-row"><Avatar professional={value} size={88} /><span className="media-actions"><label className="secondary small"><ImagePlus size={14} /> {value.photo ? 'Trocar foto' : 'Adicionar foto'}<input type="file" accept="image/*" onChange={pick('photo', 400)} hidden /></label>{value.photo && <button className="secondary small" onClick={() => setValue({ ...value, photo: undefined })}>Remover</button>}</span></div>
      </div>
      <p className="muted">A capa é opcional. Use uma imagem horizontal, como o consultório ou uma paisagem.</p>
    </Block>
    <div className="two-cols spaced-grid">
      <Block title="Apresentação">
        <label className="field"><span>Descrição <small>Uma frase abaixo do seu nome</small></span><input value={value.headline ?? ''} onChange={e => setValue({ ...value, headline: e.target.value })} placeholder={`Ex.: ${PROFESSIONS[value.profession].examples.headline}`} maxLength={140} /></label>
        <label className="field"><span>Biografia</span><textarea rows={9} value={value.bio ?? ''} onChange={e => setValue({ ...value, bio: e.target.value })} placeholder="Sua formação, experiência e como você trabalha." /></label>
      </Block>
      <Block title="Texto do agendamento">
        <p className="muted">Primeira tela depois de “Marcar consulta!”.</p>
        <label className="field"><span>Título</span><input value={value.bookingTitle} onChange={e => setValue({ ...value, bookingTitle: e.target.value })} placeholder="O que você procura?" /></label>
        <label className="field"><span>Texto de apoio</span><textarea rows={5} value={value.bookingIntro} onChange={e => setValue({ ...value, bookingIntro: e.target.value })} /></label>
      </Block>
    </div>
    <Block title="Serviços" className="spaced" action={<button className="secondary small" onClick={() => setValue({ ...value, services: [...value.services, { id: uid(), name: '' }] })}><Plus size={14} /> Adicionar serviço</button>}>
      {value.services.length ? <div className="service-editor">{value.services.map(s => <div key={s.id} className="service-row">
        <label className="field grow"><span>Nome</span><input value={s.name} onChange={e => setService(s.id, { name: e.target.value })} placeholder={`Ex.: ${PROFESSIONS[value.profession].examples.serviceName}`} /></label>
        <label className="field"><span>Duração (min)</span><input type="number" min={10} step={5} value={s.minutes ?? ''} onChange={e => setService(s.id, { minutes: e.target.value ? Number(e.target.value) : undefined })} /></label>
        <label className="field"><span>Valor da triagem <small>Opcional</small></span><input inputMode="decimal" value={s.price ?? ''} onChange={e => setService(s.id, { price: e.target.value })} onBlur={e => setService(s.id, { price: formatMoney(e.target.value) })} placeholder="R$ 0,00" /></label>
        <label className="field full-row"><span>Descrição</span><input value={s.description ?? ''} onChange={e => setService(s.id, { description: e.target.value })} placeholder={`Ex.: ${PROFESSIONS[value.profession].examples.serviceDescription}`} /></label>
        <button className="icon-button" aria-label="Remover serviço" onClick={() => setValue({ ...value, services: value.services.filter(x => x.id !== s.id) })}><Trash2 size={15} /></button>
      </div>)}</div> : <p className="muted">Nenhum serviço cadastrado.</p>}
    </Block>
  </section>;
}

/* ------------------------------------------------------------------ */
/* Meu link                                                            */
/* ------------------------------------------------------------------ */

export function MyLinkPage({ data, update }: { data: ClinicData; update: Update }) {
  const [slug, setSlug] = useState(data.professional.slug);
  const [slugError, setSlugError] = useState('');
  const [checking, setChecking] = useState(false);
  /** Endereço único e fora da lista de palavras do sistema; com Supabase, o banco confirma. */
  async function saveSlug() {
    setSlugError('');
    if (slug.length < 3) { setSlugError('Use pelo menos 3 letras ou números.'); return; }
    if (RESERVED_SLUGS.has(slug)) { setSlugError('Esse endereço é usado pelo sistema. Escolha outro.'); return; }
    if (supabase) {
      setChecking(true);
      const free = await isSlugAvailable(slug);
      setChecking(false);
      if (!free) { setSlugError('Esse endereço já está em uso. Escolha outro.'); return; }
    }
    update(d => saveProfessional(d, { slug }));
  }
  const [copied, setCopied] = useState('');
  const [origin, setOrigin] = useState('https://casozero.com.br');
  useEffect(() => setOrigin(window.location.origin), []);
  const url = `${origin}/${data.professional.slug}`;
  const copy = (value: string) => { navigator.clipboard.writeText(value); setCopied(value); setTimeout(() => setCopied(''), 1500); };
  return <section className="page">
    <PageTitle eyebrow="Divulgação" title="Meu link" text="Coloque na bio do Instagram, no WhatsApp ou imprima o QR Code no consultório." />
    <div className="two-cols">
      <Block title="Link da sua página">
        <p className="link-big">{url.replace(/^https?:\/\//, '')}</p>
        <div className="button-row"><button className="primary small" onClick={() => copy(url)}>{copied === url ? <Check size={15} /> : <Copy size={15} />} {copied === url ? 'Copiado' : 'Copiar link'}</button><a className="secondary small" href={`/${data.professional.slug}`} target="_blank" rel="noreferrer"><ExternalLink size={15} /> Abrir</a></div>
        <label className="field"><span>Endereço personalizado</span><div className="inline-form"><span className="muted">{origin.replace(/^https?:\/\//, '')}/</span><input value={slug} onChange={e => setSlug(slugify(e.target.value))} /><button className="secondary small" disabled={slug === data.professional.slug || checking} onClick={saveSlug}>{checking ? 'Verificando…' : 'Salvar'}</button></div></label>
        <FormError message={slugError} />
      </Block>
      <Block title="QR Code">
        <div className="qr"><QRCodeSVG value={url} size={176} /></div>
        <button className="secondary small" onClick={() => { const svg = document.querySelector('.qr svg'); if (!svg) return; const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' })); a.download = `qr-${data.professional.slug}.svg`; a.click(); }}><Download size={15} /> Baixar</button>
      </Block>
    </div>
    <Block title="Links diretos para agendar" className="spaced">
      <p className="muted">Pulam a página e abrem o pedido de triagem com o assunto já escolhido. Úteis em posts sobre um tema.</p>
      <div className="link-list">{[['Agendamento', `${url}/agendar`], ...data.professional.categories.map(c => [c, `${url}/agendar/${slugifyTopic(c)}`])].map(([label, u]) => <div key={u}><span>{label}</span><code>{u.replace(/^https?:\/\//, '')}</code><button className="secondary small" onClick={() => copy(u)} aria-label={`Copiar link ${label}`}>{copied === u ? <Check size={14} /> : <Copy size={14} />}</button></div>)}</div>
    </Block>
  </section>;
}

/* ------------------------------------------------------------------ */
/* Conta                                                               */
/* ------------------------------------------------------------------ */

/** Uma linha do relatório: o que a profissional precisa saber de cada paciente. */
interface PatientReportRow { id: string; name: string; category: string; status: string; since: string; done: number; missed: number; notes: number; last?: string; next?: string; }

function buildPatientReport(data: ClinicData): PatientReportRow[] {
  const now = today();
  const order = { active: 0, paused: 1, discharged: 2 } as const;
  return data.patients.slice().sort((a, b) => order[a.status] - order[b.status] || a.name.localeCompare(b.name, 'pt-BR')).map(p => {
    const sessions = data.appointments.filter(a => a.patientId === p.id && a.kind === 'session');
    const done = sessions.filter(a => a.status === 'done').map(a => a.date).sort();
    const next = sessions.filter(a => a.status === 'scheduled' && a.date >= now).map(a => a.date).sort()[0];
    return {
      id: p.id, name: p.name, category: p.category, status: PATIENT_LABELS[p.status], since: formatStamp(p.createdAt),
      done: done.length, missed: sessions.filter(a => a.status === 'missed').length,
      notes: data.notes.filter(n => n.patientId === p.id && n.number > 0).length,
      last: done.length ? formatShort(done[done.length - 1]) : undefined, next: next ? formatShort(next) : undefined,
    };
  });
}

/** Planilha para abrir no Excel (ponto e vírgula e acentos preservados). */
function downloadSpreadsheet(rows: PatientReportRow[]) {
  const header = ['Paciente', 'Assunto', 'Situação', 'Paciente desde', 'Sessões realizadas', 'Faltas', 'Anotações na caderneta', 'Última sessão', 'Próxima sessão'];
  const cell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
  const lines = [header, ...rows.map(r => [r.name, r.category, r.status, r.since, r.done, r.missed, r.notes, r.last ?? '', r.next ?? ''])].map(line => line.map(cell).join(';'));
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
  a.download = `pacientes-${iso(new Date())}.csv`;
  a.click();
}

/** Imprime só o relatório (o navegador oferece “Salvar como PDF”). */
function printReport() {
  document.body.classList.add('printing-report');
  const done = () => { document.body.classList.remove('printing-report'); window.removeEventListener('afterprint', done); };
  window.addEventListener('afterprint', done);
  window.print();
}

export function AccountPage({ data, update }: { data: ClinicData; update: Update }) {
  const [value, setValue] = useState<AccountSettings>(data.account);
  const [loginEmail, setLoginEmail] = useState(data.account.email);
  const dirty = JSON.stringify(value) !== JSON.stringify(data.account);
  useEffect(() => { supabase?.auth.getUser().then(({ data: { user } }) => { if (user?.email) setLoginEmail(user.email); }); }, []);
  async function logout() { await flushClinic(); if (supabase) await supabase.auth.signOut(); setClinicOwner(null); window.location.href = '/login'; }

  const rows = buildPatientReport(data);
  const month = today().slice(0, 7);
  const sessionsThisMonth = data.appointments.filter(a => a.kind === 'session' && a.date.startsWith(month));
  const totals = [
    { label: 'Pacientes cadastrados', value: data.patients.length },
    { label: 'Em acompanhamento', value: data.patients.filter(p => p.status === 'active').length },
    { label: 'Sessões realizadas no mês', value: sessionsThisMonth.filter(a => a.status === 'done').length },
    { label: 'Faltas no mês', value: sessionsThisMonth.filter(a => a.status === 'missed').length },
  ];

  return <section className="page">
    <PageTitle eyebrow="Conta" title="Conta e acesso" text="Seus dados de acesso e o relatório dos seus pacientes.">
      <SaveButton dirty={dirty} onSave={saveWith(update, d => saveAccount(d, value))} />
    </PageTitle>
    <div className="two-cols">
      <Block title="Dados de acesso">
        <label className="field"><span>E-mail de login</span><input type="email" value={loginEmail} readOnly /></label>
        <label className="field"><span>Celular <small>Para contato e recuperação da conta</small></span><input type="tel" value={value.phone} onChange={e => setValue({ ...value, phone: e.target.value })} /></label>
        <label className="field"><span>Chave PIX <small>Para o sinal da triagem</small></span><input value={value.pixKey} onChange={e => setValue({ ...value, pixKey: e.target.value })} placeholder="CPF, e-mail, celular ou chave aleatória" /></label>
        <div className="field-row">
          <label className="field"><span>Titular da chave</span><input value={value.pixHolder} onChange={e => setValue({ ...value, pixHolder: e.target.value })} /></label>
          <label className="field"><span>Valor do sinal <small>Opcional</small></span><input inputMode="decimal" value={value.signalAmount} onChange={e => setValue({ ...value, signalAmount: e.target.value })} onBlur={e => setValue({ ...value, signalAmount: formatMoney(e.target.value) })} placeholder="R$ 0,00" /></label>
        </div>
        <p className="muted">Plano atual: <b>{PLANS[data.plan].name}</b>.</p>
      </Block>
      <Block title="Senha">
        <p className="muted">Para trocar a senha, use <b>Esqueci minha senha</b> na tela de login. Enviamos um link para o seu e-mail e a nova senha é criada por ele.</p>
      </Block>
    </div>

    <Block title="Relatório dos pacientes" className="spaced patient-report" action={rows.length > 0 && <span className="button-row no-print">
      <button className="secondary small" onClick={() => downloadSpreadsheet(rows)}><Download size={14} /> Baixar planilha (Excel)</button>
      <button className="secondary small" onClick={printReport}><Printer size={14} /> Imprimir / salvar PDF</button>
    </span>}>
      <p className="print-only report-heading">{data.professional.name} · emitido em {formatShort(today())}</p>
      <div className="report-totals">{totals.map(t => <div key={t.label}><strong>{t.value}</strong><span>{t.label}</span></div>)}</div>
      {rows.length ? <div className="report-table-wrap"><table className="report-table">
        <thead><tr><th>Paciente</th><th>Situação</th><th>Desde</th><th>Sessões</th><th>Faltas</th><th>Última</th><th>Próxima</th></tr></thead>
        <tbody>{rows.map(r => <tr key={r.id}>
          <td><Link href={`/app/pacientes/detalhe/?id=${r.id}`}><b>{r.name}</b></Link><small>{r.category}</small></td>
          <td>{r.status}</td><td>{r.since}</td><td>{r.done}</td><td>{r.missed}</td><td>{r.last ?? '—'}</td><td>{r.next ?? '—'}</td>
        </tr>)}</tbody>
      </table></div> : <p className="muted">Quando você tiver pacientes, eles aparecem aqui com o número de sessões, faltas e as datas da última e da próxima sessão.</p>}
    </Block>

    <div className="account-footer no-print">
      <button className="secondary small" onClick={logout}><LogOut size={14} /> Sair</button>
      {supabase
        ? <a className="ghost-danger small" href="mailto:contato@casozero.com.br?subject=Excluir%20minha%20conta%20no%20CasoZero"><Trash2 size={14} /> Pedir exclusão da conta</a>
        : <button className="ghost-danger small" onClick={() => { if (confirm('Na demonstração, isso volta ao exemplo inicial. Continuar?')) { resetClinic(); window.location.href = '/'; } }}><Trash2 size={14} /> Excluir conta</button>}
    </div>
  </section>;
}

/* ------------------------------------------------------------------ */
/* Assinatura                                                          */
/* ------------------------------------------------------------------ */

export function SubscriptionPage({ data, update }: { data: ClinicData; update: Update }) {
  const [selected, setSelected] = useState<PlanId>();
  const [seats, setSeats] = useState(Math.max(MIN_CLINIC_SEATS, data.team.filter(m => m.role === 'professional').length + 1));
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  // Retorno do checkout da Stripe.
  useEffect(() => {
    const checkout = new URLSearchParams(window.location.search).get('checkout');
    if (checkout === 'success') setNotice('Pagamento confirmado. O plano é atualizado assim que a Stripe avisa, em poucos segundos.');
    if (checkout === 'cancelled') setNotice('Pagamento cancelado. Nada foi cobrado.');
  }, []);
  useEffect(() => { (async () => {
    if (!supabase) return;
    const { data: { user } } = await supabase.auth.getUser(); if (!user) return;
    const { data: row } = await supabase.from('subscriptions').select('plan_id').eq('user_id', user.id).eq('status', 'active').order('updated_at', { ascending: false }).limit(1).maybeSingle();
    const plan = toPlanId(row?.plan_id);
    if (plan && plan !== data.plan) update(d => setPlan(d, plan));
  })(); }, [data.plan, update]);
  const plan = PLANS[data.plan];
  const total = data.patients.length;
  const limit = plan.maxPatients;
  async function choose() {
    if (!selected) return;
    setNotice('');
    const freeLimit = PLANS.gratis.maxPatients ?? 0;
    const applyLocally = () => {
      if (selected === 'gratis' && total >= freeLimit) setNotice(`Você tem ${total} pacientes cadastrados. No Grátis o limite é ${freeLimit}: todos continuam acessíveis, mas não dá para cadastrar novos.`);
      update(d => setPlan(d, selected)); setSelected(undefined);
    };
    // Sem Supabase/Stripe: troca local para testar os recursos de cada plano.
    if (!supabase) { applyLocally(); return; }
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    const response = await fetch('/api/stripe/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` }, body: JSON.stringify({ plan: selected, seats }) });
    const result = await response.json();
    if (result.url) { window.location.href = result.url; return; }
    setLoading(false);
    if (result.free) { applyLocally(); return; }
    if (result.cancelAt !== undefined) {
      setSelected(undefined);
      setNotice(`Assinatura cancelada. Você continua no plano ${plan.name}${result.cancelAt ? ` até ${formatShort(result.cancelAt.slice(0, 10))}` : ' até o fim do período pago'} e depois passa para o Grátis.`);
      return;
    }
    if (result.switched) {
      setSelected(undefined);
      setNotice(`Plano alterado para ${PLANS[selected].name}. A diferença proporcional entra na próxima fatura.`);
      // O webhook grava o novo plano em poucos segundos; espera por ele antes de mudar a tela.
      for (let i = 0; i < 10 && user; i++) {
        await new Promise(r => setTimeout(r, 1500));
        const { data: row } = await supabase.from('subscriptions').select('plan_id').eq('user_id', user.id).eq('status', 'active').order('updated_at', { ascending: false }).limit(1).maybeSingle();
        if (row?.plan_id === selected) { update(d => setPlan(d, selected)); return; }
      }
      return;
    }
    setNotice(result.error || 'Não foi possível abrir o checkout.');
  }
  return <section className="page">
    <PageTitle eyebrow="Conta" title="Assinatura" text="Todos os recursos estão em todos os planos. O que muda é o limite de pacientes e a equipe." />
    <div className="two-cols">
      <Block title={`Plano ${plan.name}`}><p className="big-number">{plan.price === 0 ? 'R$ 0' : formatBRL(plan.price)}<small>/mês{plan.perProfessional ? ' por profissional' : ''}</small></p><p className="muted">{plan.description}</p></Block>
      <Block title="Pacientes cadastrados">
        <p className="big-number">{total}<small>{limit !== undefined ? ` de ${limit}` : ' · sem limite'}</small></p>
        {limit !== undefined && <div className="usage-bar"><i style={{ width: `${Math.min(100, Math.round(total / limit * 100))}%` }} /></div>}
        <p className="muted status-line">{limit !== undefined ? 'Contam todos os pacientes já cadastrados, inclusive pausados e com alta.' : 'Cadastre quantos pacientes quiser.'}</p>
      </Block>
    </div>
    <Block title="Trocar de plano" className="spaced">
      <div className="plan-options">{Object.values(PLANS).filter(p => p.id !== data.plan).map(p => <button key={p.id} className={selected === p.id ? 'on' : ''} onClick={() => setSelected(p.id)}><strong>{p.name}</strong><span>{priceLabel(p)}</span><small>{p.maxPatients ? `Até ${p.maxPatients} pacientes` : 'Pacientes ilimitados'}{p.team ? ' · equipe e secretária' : ''}</small></button>)}</div>
      {selected === 'clinica' && <label className="field narrow"><span>Quantos profissionais? <small>Mínimo {MIN_CLINIC_SEATS}</small></span><input type="number" min={MIN_CLINIC_SEATS} value={seats} onChange={e => setSeats(Math.max(MIN_CLINIC_SEATS, Number(e.target.value) || MIN_CLINIC_SEATS))} /><small className="muted">Total: {formatBRL(seats * PLANS.clinica.price)}/mês</small></label>}
      {selected && <button className="primary" disabled={loading} onClick={choose}>{loading ? <><Loader2 size={15} className="spin" /> Abrindo Stripe…</> : <>{supabase && selected !== 'gratis' ? 'Assinar' : 'Usar'} o plano {PLANS[selected].name} <ArrowRight size={15} /></>}</button>}
      {!supabase && <p className="muted status-line">Modo demonstração: a troca é imediata e não cobra nada, para você testar cada plano.</p>}
      {notice && <p className="auth-notice">{notice}</p>}
    </Block>
  </section>;
}

/* ------------------------------------------------------------------ */
/* Equipe (plano Clínica)                                              */
/* ------------------------------------------------------------------ */

export const ROLE_LABELS: Record<TeamRole, string> = { professional: 'Profissional', secretary: 'Secretária(o)' };

export function TeamPage({ data, update }: { data: ClinicData; update: Update }) {
  const [team, setTeam] = useState<TeamMember[]>(data.team);
  const [draft, setDraft] = useState<{ name: string; email: string; role: TeamRole; profession: ProfessionId }>({ name: '', email: '', role: 'secretary', profession: 'psicologia' });
  const dirty = JSON.stringify(team) !== JSON.stringify(data.team);
  if (!PLANS[data.plan].team) return <section className="page">
    <PageTitle eyebrow="Clínica" title="Equipe" text="Agenda compartilhada e acesso para secretária fazem parte do plano Clínica." />
    <Block title="Disponível no plano Clínica"><p className="muted">Cada profissional mantém a própria caderneta, que só ele vê. A secretária acessa apenas a agenda de todos.</p><Link className="primary small" href="/app/configuracoes/assinatura">Ver planos</Link></Block>
  </section>;
  const add = () => { if (!draft.name.trim() || !draft.email.trim()) return; setTeam([...team, { id: uid(), name: draft.name.trim(), email: draft.email.trim(), role: draft.role, profession: draft.role === 'professional' ? draft.profession : undefined, status: 'invited' }]); setDraft({ ...draft, name: '', email: '' }); };
  const secretary = team.find(m => m.role === 'secretary');
  return <section className="page">
    <PageTitle eyebrow="Clínica" title="Equipe" text="Quem atende com você e quem cuida da agenda.">
      <SaveButton dirty={dirty} onSave={saveWith(update, d => saveTeam(d, team))} />
    </PageTitle>
    <div className="two-cols">
      <Block title="Pessoas">
        <div className="device-row"><Avatar professional={data.professional} size={32} /><span><strong>{data.professional.name}</strong><small>{PROFESSIONS[data.professional.profession].label} · responsável pela conta</small></span><span className="badge badge-active">Você</span></div>
        {team.map(m => <div key={m.id} className="device-row"><span className="initials">{m.name.split(' ').map(x => x[0]).slice(0, 2).join('')}</span><span><strong>{m.name}</strong><small>{m.role === 'professional' && m.profession ? PROFESSIONS[m.profession].label : ROLE_LABELS[m.role]} · {m.email}</small></span>{m.status === 'invited' && <span className="badge badge-pending">Convite enviado</span>}<button className="icon-button" aria-label={`Remover ${m.name}`} onClick={() => setTeam(team.filter(x => x.id !== m.id))}><Trash2 size={14} /></button></div>)}
      </Block>
      <div className="stack">
        <Block title="Convidar">
          <label className="field"><span>Nome</span><input value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} /></label>
          <label className="field"><span>E-mail</span><input type="email" value={draft.email} onChange={e => setDraft({ ...draft, email: e.target.value })} /></label>
          <div className="field"><span>Acesso</span><div className="segmented">{(['secretary', 'professional'] as TeamRole[]).map(r => <button type="button" key={r} className={draft.role === r ? 'active' : ''} onClick={() => setDraft({ ...draft, role: r })}>{ROLE_LABELS[r]}</button>)}</div></div>
          {draft.role === 'professional' && <label className="field"><span>Profissão</span><select value={draft.profession} onChange={e => setDraft({ ...draft, profession: e.target.value as ProfessionId })}>{PROFESSION_LIST.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select></label>}
          <button className="secondary small" disabled={!draft.name.trim() || !draft.email.trim()} onClick={add}><Plus size={14} /> Adicionar à equipe</button>
        </Block>
        <Block title="O que cada um vê">
          <ul className="access-list">
            <li><b>Profissional</b> Agenda compartilhada, os próprios pacientes e a própria caderneta. Nunca a caderneta dos colegas.</li>
            <li><b>Secretária(o)</b> Só a agenda de todos: horários, nomes e situação. Sem caderneta, evolução ou dados da triagem.</li>
          </ul>
          {secretary && !dirty && <button className="secondary small" onClick={async () => { update(d => setViewAs(d, secretary.id)); await flushClinic(); window.location.href = '/app/agenda'; }}><Eye size={14} /> Ver o painel como {secretary.name.split(' ')[0]}</button>}
        </Block>
      </div>
    </div>
  </section>;
}
