'use client';
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatLong, fromIso, monthGrid, today, WEEKDAYS_SHORT } from '@/lib/dates';
import { ClinicData, useClinic } from '@/services/clinic';
import { Block, PageTitle } from './shell';
import { AppointmentRow } from './dashboard';

type Update = ReturnType<typeof useClinic>['update'];

export function Agenda({ data, update }: { data: ClinicData; update: Update }) {
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [selected, setSelected] = useState(today());
  const days = monthGrid(cursor.year, cursor.month);
  const move = (delta: number) => { const d = new Date(cursor.year, cursor.month + delta, 1); setCursor({ year: d.getFullYear(), month: d.getMonth() }); };
  const visible = data.appointments.filter(a => a.status !== 'canceled');
  const byDay = (date: string) => visible.filter(a => a.date === date).sort((a, b) => a.time.localeCompare(b.time));
  const pendingByDay = (date: string) => data.requests.filter(r => r.status === 'pending' && r.requestedDate === date);
  const selectedItems = data.appointments.filter(a => a.date === selected).sort((a, b) => a.time.localeCompare(b.time));
  const blocked = data.professional.availability.blockedDates.includes(selected);
  return <section className="page">
    <PageTitle eyebrow="Organização" title="Agenda" text="Triagens e sessões. As sessões dos pacientes com horário fixo entram sozinhas." />
    <section className="panel calendar">
      <div className="calendar-head"><button className="icon-button" onClick={() => move(-1)} aria-label="Mês anterior"><ChevronLeft /></button><h2>{new Date(cursor.year, cursor.month, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</h2><button className="icon-button" onClick={() => move(1)} aria-label="Próximo mês"><ChevronRight /></button></div>
      <div className="calendar-week">{WEEKDAYS_SHORT.map(x => <span key={x}>{x}</span>)}</div>
      <div className="calendar-grid">{days.map((date, i) => {
        if (!date) return <span className="calendar-spacer" key={`gap-${i}`} />;
        const items = byDay(date); const requests = pendingByDay(date);
        return <button key={date} className={`calendar-day ${date === selected ? 'selected' : ''} ${date === today() ? 'today' : ''}`} onClick={() => setSelected(date)}>
          <strong>{fromIso(date).getDate()}</strong>
          {items.slice(0, 3).map(a => <small key={a.id} className={`chip-${a.kind} ${a.status}`}>{a.time} {a.title.split(' ')[0]}</small>)}
          {items.length > 3 && <small className="more">+{items.length - 3}</small>}
          {requests.length > 0 && <small className="chip-request">{requests.length} pedido(s)</small>}
        </button>;
      })}</div>
      <div className="calendar-legend"><span className="chip-session">Sessão</span><span className="chip-triage">Triagem</span><span className="chip-request">Pedido aguardando</span></div>
    </section>
    <Block title={formatLong(selected)} className="spaced">
      {blocked && <p className="muted">Dia bloqueado na sua disponibilidade.</p>}
      {pendingByDay(selected).map(r => <a key={r.id} className="request-inline" href={`/app/solicitacoes/detalhe/?id=${r.id}`}>{r.requestedTime} · pedido de triagem de <b>{r.name}</b> aguardando confirmação →</a>)}
      {selectedItems.length ? selectedItems.map(a => <AppointmentRow key={a.id} appointment={a} data={data} update={update} />) : !pendingByDay(selected).length && <p className="muted">Nada marcado neste dia.</p>}
    </Block>
  </section>;
}
