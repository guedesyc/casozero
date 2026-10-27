'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { CalendarCheck, CalendarClock, Check, ChevronRight, ClipboardCheck, MessageCircle, X } from 'lucide-react';
import { addDays, formatDayMonth, formatLong, formatStamp, WEEKDAYS, weekdayOf } from '@/lib/dates';
import { ClinicData, completeTriage, confirmPayment, confirmRequest, declineRequest, flushClinic, useClinic } from '@/services/clinic';
import { ensureTrackingToken } from '@/services/remote';
import { formatMoney } from '@/config/plans';
import { availableDates, freeSlots, isPast } from '@/services/scheduling';
import { Slot, SlotPicker } from '@/components/ui/slot-picker';
import { Frequency, RequestStatus, TriageRequest } from '@/types';
import { Badge, Block, FormError, initials, PageTitle, REQUEST_LABELS } from './shell';

type Update = ReturnType<typeof useClinic>['update'];
const TABS: { key: string; label: string; match: RequestStatus[] }[] = [
  { key: 'pending', label: 'Aguardando você', match: ['pending'] },
  { key: 'confirmed', label: 'Triagens marcadas', match: ['awaiting_payment', 'confirmed'] },
  { key: 'closed', label: 'Encerradas', match: ['continued', 'not_continued', 'declined'] },
];

export function RequestsList({ data }: { data: ClinicData }) {
  const [tab, setTab] = useState('pending');
  const current = TABS.find(t => t.key === tab)!;
  const items = data.requests.filter(r => current.match.includes(r.status)).sort((a, b) => (a.scheduledDate ?? a.requestedDate).localeCompare(b.scheduledDate ?? b.requestedDate));
  return <section className="page">
    <PageTitle eyebrow="Link público" title="Solicitações" text="Pedidos de triagem feitos pelo seu link. Confirme, sugira outro horário ou recuse." />
    <div className="tabs">{TABS.map(t => <button key={t.key} className={t.key === tab ? 'active' : ''} onClick={() => setTab(t.key)}>{t.label} <b>{data.requests.filter(r => t.match.includes(r.status)).length}</b></button>)}</div>
    <div className="list">{items.length ? items.map(r => <Link key={r.id} href={`/app/solicitacoes/detalhe/?id=${r.id}`} className="list-row">
      <span className="initials">{initials(r.name)}</span>
      <span className="list-main"><strong>{r.name}</strong><small>{r.age} anos · {r.service ? `${r.service} · ` : ''}{r.category}</small></span>
      <span className="list-when"><CalendarClock size={14} /> {formatDayMonth(r.scheduledDate ?? r.requestedDate)}, {r.scheduledTime ?? r.requestedTime}</span>
      <Badge tone={r.status}>{REQUEST_LABELS[r.status]}</Badge>
      <ChevronRight size={16} />
    </Link>) : <p className="muted empty-list">Nada por aqui.</p>}</div>
  </section>;
}

const whatsapp = (phone: string, text: string) => `https://wa.me/55${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;

export function RequestDetail({ id, data, update }: { id?: string; data: ClinicData; update: Update }) {
  const request = data.requests.find(r => r.id === id);
  const [mode, setMode] = useState<'none' | 'reschedule' | 'decline' | 'outcome'>('none');
  const [sendingWhatsapp, setSendingWhatsapp] = useState(false);
  const [reason, setReason] = useState('');
  const [slot, setSlot] = useState<Slot>();
  const [error, setError] = useState('');
  const others = useMemo(() => data.requests.filter(r => r.id !== id), [data.requests, id]);
  const appointmentsWithoutThis = useMemo(() => data.appointments.filter(a => a.requestId !== id), [data.appointments, id]);
  const dates = useMemo(() => availableDates(data.professional, appointmentsWithoutThis, others), [data.professional, appointmentsWithoutThis, others]);
  if (!request) return <section className="page empty"><h1>Solicitação não encontrada</h1><Link href="/app/solicitacoes">Voltar</Link></section>;

  const first = request.name.split(' ')[0];
  const proFirst = data.professional.name.split(' ')[0];
  const date = request.scheduledDate ?? request.requestedDate;
  const time = request.scheduledTime ?? request.requestedTime;
  const triageHappened = (request.status === 'confirmed' || request.status === 'awaiting_payment') && isPast(date, time);
  // Mensagem de confirmação: reserva, sinal por PIX (configurado na Conta) e link de acompanhamento.
  const confirmMessage = (trackingLink?: string) => {
    const { pixKey, pixHolder, signalAmount } = data.account;
    const lines = [`Olá, ${first}! Aqui é ${proFirst}. Sua reserva da triagem está confirmada para ${formatLong(date)}, às ${time}.`];
    if (pixKey) lines.push(`Para firmar a vaga, faça o PIX${signalAmount ? ` de ${formatMoney(signalAmount)}` : ' da triagem'} na chave ${pixKey}${pixHolder ? ` (${pixHolder})` : ''}.`);
    if (trackingLink) lines.push(`Acompanhe o seu pedido por este link: ${trackingLink}`);
    lines.push('Qualquer dúvida, é só responder esta mensagem.');
    return lines.join('\n\n');
  };
  async function sendWhatsapp(target: TriageRequest) {
    setSendingWhatsapp(true);
    const token = await ensureTrackingToken(target.id).catch(() => undefined);
    setSendingWhatsapp(false);
    const link = token ? `${window.location.origin}/r/${token}` : undefined;
    window.open(whatsapp(target.phone, confirmMessage(link)), '_blank', 'noopener');
  }
  const patient = request.patientId && data.patients.find(p => p.id === request.patientId);

  return <section className="page detail">
    <Link href="/app/solicitacoes" className="back">← Solicitações</Link>
    <PageTitle eyebrow={`Pedido recebido em ${formatStamp(request.createdAt)}`} title={request.name} text={<>{request.age} anos · {request.service ? `${request.service} · ` : ''}{request.category}{request.modality && ` · prefere ${request.modality}`}</>}>
      <Badge tone={request.status}>{REQUEST_LABELS[request.status]}</Badge>
    </PageTitle>
    <div className="detail-grid">
      <div className="stack">
        <Block title="O que procura tratar"><p className="quote">{request.concern}</p></Block>
        {request.expectation && <Block title="O que imagina do acompanhamento"><p className="quote">{request.expectation}</p></Block>}
        <Block title="Contato"><dl className="facts"><div><dt>Telefone</dt><dd>{request.phone}</dd></div>{request.guardianName && <div><dt>Responsável</dt><dd>{request.guardianName}</dd></div>}</dl></Block>
        {request.declineReason && <Block title="Motivo da recusa"><p>{request.declineReason}</p></Block>}
        {request.outcomeNote && <Block title="Resultado da triagem"><p>{request.outcomeNote}</p></Block>}
      </div>
      <aside className="stack">
        <Block title={request.status === 'pending' ? 'Horário pedido' : 'Triagem'}>
          <p className="big-date">{formatLong(date)}<br /><b>{time}</b> · {data.professional.availability.triageMinutes} min</p>
          {request.status === 'pending' && <div className="stack-buttons">
            <button className="primary full" onClick={() => setError(update(d => confirmRequest(d, request.id, request.requestedDate, request.requestedTime)).error ?? '')}><CalendarCheck size={16} /> Confirmar este horário</button>
            <button className="secondary full" onClick={() => { setError(''); setMode('reschedule'); }}><CalendarClock size={16} /> Marcar em outro horário</button>
            <button className="ghost-danger full" onClick={() => setMode('decline')}>Recusar pedido</button>
          </div>}
          {(request.status === 'awaiting_payment' || request.status === 'confirmed') && <div className="stack-buttons">
            {request.status === 'awaiting_payment' && <div className="payment-box">
              <p><b>Aguardando o sinal por PIX.</b></p>
              {request.paymentReportedAt
                ? <p className="muted">O paciente informou o pagamento em {formatStamp(request.paymentReportedAt)}. Confira na sua conta e confirme.</p>
                : <p className="muted">O paciente ainda não informou o pagamento.</p>}
              <button className="primary full" onClick={() => setError(update(d => confirmPayment(d, request.id)).error ?? '')}><Check size={16} /> Confirmar pagamento</button>
            </div>}
            <button className="secondary full" onClick={() => sendWhatsapp(request)} disabled={sendingWhatsapp}><MessageCircle size={16} /> {sendingWhatsapp ? 'Preparando…' : 'Avisar pelo WhatsApp'}</button>
            {triageHappened ? <button className="primary full" onClick={() => setMode('outcome')}><ClipboardCheck size={16} /> Registrar resultado da triagem</button>
              : <><button className="secondary full" onClick={() => { setError(''); setMode('reschedule'); }}><CalendarClock size={16} /> Remarcar</button><button className="primary full" onClick={() => setMode('outcome')}><ClipboardCheck size={16} /> Registrar resultado</button></>}
          </div>}
          <FormError message={mode === 'none' ? error : ''} />
          {patient && <Link className="secondary full" href={`/app/pacientes/detalhe/?id=${patient.id}`}>Abrir paciente</Link>}
        </Block>
      </aside>
    </div>

    {mode === 'reschedule' && <Dialog title="Escolher outro horário" close={() => setMode('none')}>
      <p className="muted">Mostrando seus horários livres para triagem. Combine com {first} antes de confirmar.</p>
      <SlotPicker available={dates} slotsFor={d => freeSlots(data.professional, appointmentsWithoutThis, others, d, new Date(0))} value={slot} onChange={setSlot} />
      <button className="primary full" disabled={!slot} onClick={() => { const r = update(d => confirmRequest(d, request.id, slot!.date, slot!.time)); setError(r.error ?? ''); if (!r.error) setMode('none'); }}>Confirmar {slot && `${formatDayMonth(slot.date)}, ${slot.time}`}</button>
      <FormError message={error} />
    </Dialog>}
    {mode === 'decline' && <Dialog title="Recusar pedido" close={() => setMode('none')}>
      <label className="field"><span>Motivo ou encaminhamento <small>Fica só no seu registro</small></span><textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="Ex.: fora da minha área; encaminhado para…" /></label>
      <button className="primary full" onClick={() => { update(d => declineRequest(d, request.id, reason)); setMode('none'); }}>Recusar</button>
    </Dialog>}
    {mode === 'outcome' && <OutcomeDialog request={request} update={update} close={() => setMode('none')} />}
  </section>;
}

function OutcomeDialog({ request, update, close }: { request: TriageRequest; update: Update; close: () => void }) {
  const base = request.scheduledDate ?? request.requestedDate;
  const [continues, setContinues] = useState<boolean>();
  const [note, setNote] = useState('');
  const [weekday, setWeekday] = useState(weekdayOf(base));
  const [time, setTime] = useState(request.scheduledTime ?? '09:00');
  const [frequency, setFrequency] = useState<Frequency>('weekly');
  const [startDate, setStartDate] = useState(addDays(base, 7));
  const [error, setError] = useState('');
  async function save() {
    const result = update(d => completeTriage(d, request.id, { continues: Boolean(continues), note, recurrence: continues ? { weekday, time, frequency, startDate } : undefined }));
    if (result.error) { setError(result.error); return; }
    await flushClinic();
    if (result.value) window.location.href = `/app/pacientes/detalhe/?id=${result.value.id}`; else close();
  }
  return <Dialog title="Resultado da triagem" close={close}>
    <label className="field"><span>Anotações da triagem <small>Vão para a caderneta como “Triagem”</small></span><textarea rows={4} value={note} onChange={e => setNote(e.target.value)} placeholder="Queixa principal, impressões, combinados…" /></label>
    <div className="field"><span>O atendimento vai continuar?</span><div className="segmented"><button className={continues === true ? 'active' : ''} onClick={() => setContinues(true)}>Sim, seguir acompanhamento</button><button className={continues === false ? 'active' : ''} onClick={() => setContinues(false)}>Não seguir</button></div></div>
    {continues && <div className="recurrence-form">
      <p className="muted">Defina o horário fixo. As sessões serão lançadas na agenda automaticamente.</p>
      <div className="field-row">
        <label className="field"><span>Dia da semana</span><select value={weekday} onChange={e => setWeekday(Number(e.target.value))}>{WEEKDAYS.map((w, i) => <option key={w} value={i}>{w}</option>)}</select></label>
        <label className="field"><span>Horário</span><input type="time" value={time} onChange={e => setTime(e.target.value)} /></label>
      </div>
      <div className="field-row">
        <label className="field"><span>Frequência</span><select value={frequency} onChange={e => setFrequency(e.target.value as Frequency)}><option value="weekly">Semanal</option><option value="biweekly">Quinzenal</option></select></label>
        <label className="field"><span>A partir de</span><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></label>
      </div>
    </div>}
    <button className="primary full" disabled={continues === undefined} onClick={save}>{continues ? 'Criar paciente e lançar sessões' : 'Encerrar solicitação'}</button>
    <FormError message={error} />
  </Dialog>;
}

export function Dialog({ title, close, children }: { title: string; close: () => void; children: React.ReactNode }) {
  return <div className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={e => { if (e.target === e.currentTarget) close(); }}><div className="modal-card"><button className="modal-close" onClick={close} aria-label="Fechar"><X size={18} /></button><h2>{title}</h2>{children}</div></div>;
}
