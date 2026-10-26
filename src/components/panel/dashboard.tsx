'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ChevronRight, NotebookPen } from 'lucide-react';
import { addDays, formatDayMonth, formatLong, today } from '@/lib/dates';
import { ClinicData, ensureNote, flushClinic, setAppointmentStatus, useClinic, viewingAsSecretary } from '@/services/clinic';
import { isPast } from '@/services/scheduling';
import { Appointment } from '@/types';
import { APPOINTMENT_LABELS, Badge, Block, initials, PageTitle } from './shell';

type Update = ReturnType<typeof useClinic>['update'];

function Greeting({ name }: { name: string }) {
  const [text, setText] = useState('Olá');
  useEffect(() => { const h = new Date().getHours(); setText(h >= 5 && h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'); }, []);
  return <>{text}, {name.split(' ')[0]}.</>;
}

/** Linha de compromisso usada na visão geral e na agenda. */
export function AppointmentRow({ appointment, data, update, showDate = false, owner }: { appointment: Appointment; data: ClinicData; update: Update; showDate?: boolean; owner?: string }) {
  const note = data.notes.find(n => n.appointmentId === appointment.id);
  const href = appointment.kind === 'triage' ? `/app/solicitacoes/detalhe/?id=${appointment.requestId}` : `/app/pacientes/detalhe/?id=${appointment.patientId}`;
  const openNote = async () => { const created = update(d => ensureNote(d, appointment.id)); if (!created) return; await flushClinic(); window.location.href = `/app/pacientes/detalhe/?id=${appointment.patientId}&sessao=${created.id}`; };
  const pending = appointment.status === 'scheduled' && isPast(appointment.date, appointment.time);
  // A secretária vê horário, nome e situação; nunca abre paciente nem caderneta.
  const secretary = viewingAsSecretary(data);
  const who = <><span className="initials">{initials(appointment.title)}</span><span><strong>{appointment.title}</strong><small>{appointment.kind === 'triage' ? 'Triagem' : !secretary && note ? `Sessão ${note.number}` : 'Sessão'} · {appointment.minutes} min{owner && ` · ${owner}`}</small></span></>;
  return <div className={`appt-row ${appointment.status}`}>
    <div className="appt-time"><strong>{appointment.time}</strong>{showDate && <small>{formatDayMonth(appointment.date)}</small>}</div>
    {secretary ? <span className="appt-who">{who}</span> : <Link href={href} className="appt-who">{who}</Link>}
    {pending ? <Badge tone="warn">Registrar</Badge> : <Badge tone={appointment.status}>{APPOINTMENT_LABELS[appointment.status]}</Badge>}
    <div className="appt-actions">
      {!secretary && appointment.kind === 'session' && appointment.status !== 'canceled' && appointment.status !== 'missed' && <button className="secondary small" onClick={openNote} disabled={!isPast(appointment.date, appointment.time) && appointment.status === 'scheduled'} title="Abrir a caderneta desta sessão"><NotebookPen size={14} /> Caderneta</button>}
      {appointment.kind === 'session' && appointment.status === 'scheduled' && <select aria-label="Situação" value="" onChange={e => update(d => setAppointmentStatus(d, appointment.id, e.target.value as Appointment['status']))}><option value="" disabled>Marcar…</option><option value="done">Realizada</option><option value="missed">Falta</option><option value="canceled">Cancelada</option></select>}
    </div>
  </div>;
}

export function Dashboard({ data, update }: { data: ClinicData; update: Update }) {
  const d = today();
  const pending = data.requests.filter(r => r.status === 'pending').sort((a, b) => `${a.requestedDate}${a.requestedTime}`.localeCompare(`${b.requestedDate}${b.requestedTime}`));
  const todays = data.appointments.filter(a => a.date === d && a.status !== 'canceled').sort((a, b) => a.time.localeCompare(b.time));
  const upcomingTriages = data.appointments.filter(a => a.kind === 'triage' && a.status === 'scheduled' && a.date >= d && a.date <= addDays(d, 7));
  const unrecorded = data.appointments.filter(a => a.kind === 'session' && a.status === 'scheduled' && a.date < d).sort((a, b) => b.date.localeCompare(a.date));
  // Triagens confirmadas cujo horário já passou e que ainda não tiveram o resultado registrado.
  const triagesWithoutOutcome = data.requests.filter(r => r.status === 'confirmed' && r.scheduledDate && r.scheduledTime && isPast(r.scheduledDate, r.scheduledTime));
  const active = data.patients.filter(p => p.status === 'active').length;
  return <section className="page">
    <PageTitle eyebrow={formatLong(d)} title={<Greeting name={data.professional.name} />} text="Aqui está o que precisa da sua atenção." />
    <div className="metrics">
      <Link href="/app/solicitacoes" className="metric"><span>Solicitações</span><strong>{pending.length}</strong><p>aguardando sua resposta</p></Link>
      <Link href="/app/agenda" className="metric"><span>Hoje</span><strong>{todays.length}</strong><p>atendimento(s) na agenda</p></Link>
      <Link href="/app/agenda" className="metric"><span>Próximos 7 dias</span><strong>{upcomingTriages.length}</strong><p>triagem(ns) marcada(s)</p></Link>
      <Link href="/app/pacientes" className="metric"><span>Pacientes</span><strong>{active}</strong><p>em acompanhamento</p></Link>
    </div>
    <div className="two-cols">
      <Block title="Agenda de hoje" action={<Link className="text-link" href="/app/agenda">Abrir agenda <ChevronRight size={15} /></Link>}>
        {todays.length ? todays.map(a => <AppointmentRow key={a.id} appointment={a} data={data} update={update} />) : <p className="muted">Nenhum atendimento hoje.</p>}
      </Block>
      <Block title="Pedidos de triagem" action={<Link className="text-link" href="/app/solicitacoes">Ver todos <ChevronRight size={15} /></Link>}>
        {pending.length ? pending.slice(0, 5).map(r => <Link key={r.id} href={`/app/solicitacoes/detalhe/?id=${r.id}`} className="request-row"><span className="initials">{initials(r.name)}</span><span><strong>{r.name}</strong><small>{r.category} · pediu {formatDayMonth(r.requestedDate)}, {r.requestedTime}</small></span><ChevronRight size={16} /></Link>) : <p className="muted">Nenhum pedido aguardando. Divulgue seu <Link href="/app/meu-link">link</Link>.</p>}
      </Block>
    </div>
    {triagesWithoutOutcome.length > 0 && <Block title={`Triagens sem resultado (${triagesWithoutOutcome.length})`} className="spaced"><p className="muted">A triagem já aconteceu. Registre se o atendimento vai continuar.</p>{triagesWithoutOutcome.map(r => <Link key={r.id} href={`/app/solicitacoes/detalhe/?id=${r.id}`} className="request-row"><span className="initials">{initials(r.name)}</span><span><strong>{r.name}</strong><small>{r.category} · triagem em {formatDayMonth(r.scheduledDate!)}, {r.scheduledTime}</small></span><ChevronRight size={16} /></Link>)}</Block>}
    {unrecorded.length > 0 && <Block title={`Sessões sem registro (${unrecorded.length})`} className="spaced"><p className="muted">Sessões que já passaram e ainda não foram marcadas como realizadas, falta ou canceladas.</p>{unrecorded.slice(0, 6).map(a => <AppointmentRow key={a.id} appointment={a} data={data} update={update} showDate />)}</Block>}
  </section>;
}
