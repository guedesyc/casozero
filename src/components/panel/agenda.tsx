'use client';
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PLANS } from '@/config/plans';
import { PROFESSIONS } from '@/config/professions';
import { formatLong, fromIso, monthGrid, today, WEEKDAYS_SHORT } from '@/lib/dates';
import { ClinicData, useClinic, viewingAsSecretary } from '@/services/clinic';
import { Badge, Block, initials, PageTitle } from './shell';
import { AppointmentRow } from './dashboard';

type Update = ReturnType<typeof useClinic>['update'];
const OWNER = 'owner';

export function Agenda({ data, update }: { data: ClinicData; update: Update }) {
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [selected, setSelected] = useState(today());
  // Plano Clínica: agenda compartilhada, com filtro por profissional.
  const shared = PLANS[data.plan].team;
  const secretary = viewingAsSecretary(data);
  const colleagues = shared ? data.team.filter(m => m.role === 'professional') : [];
  const [filter, setFilter] = useState<string>('all');
  const showOwner = filter === 'all' || filter === OWNER;
  const showMember = (id: string) => filter === 'all' || filter === id;
  const colorOf = (memberId: string) => `member-${(colleagues.findIndex(m => m.id === memberId) % 4) + 1}`;
  const ownerFirst = data.professional.name.split(' ')[0];

  const days = monthGrid(cursor.year, cursor.month);
  const move = (delta: number) => { const d = new Date(cursor.year, cursor.month + delta, 1); setCursor({ year: d.getFullYear(), month: d.getMonth() }); };
  const own = (date: string) => showOwner ? data.appointments.filter(a => a.date === date && a.status !== 'canceled').sort((a, b) => a.time.localeCompare(b.time)) : [];
  const team = (date: string) => data.teamAppointments.filter(a => a.date === date && colleagues.some(m => m.id === a.memberId) && showMember(a.memberId)).sort((a, b) => a.time.localeCompare(b.time));
  const pendingByDay = (date: string) => showOwner ? data.requests.filter(r => r.status === 'pending' && r.requestedDate === date) : [];
  const blocksOf = (date: string) => showOwner ? data.professional.availability.blocks.filter(b => b.date === date) : [];
  const selectedOwn = showOwner ? data.appointments.filter(a => a.date === selected).sort((a, b) => a.time.localeCompare(b.time)) : [];
  const selectedTeam = team(selected);
  const selectedBlocks = blocksOf(selected);
  const selectedPending = pendingByDay(selected);
  const empty = !selectedOwn.length && !selectedTeam.length && !selectedBlocks.length && !selectedPending.length;

  return <section className="page">
    <PageTitle eyebrow={shared ? 'Agenda compartilhada' : 'Organização'} title="Agenda" text={shared ? 'Os atendimentos de toda a clínica. Cada caderneta continua visível só para o próprio profissional.' : 'Triagens e sessões. As sessões dos pacientes com horário fixo entram sozinhas.'} />
    {shared && <div className="tabs">
      <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>Todos</button>
      <button className={filter === OWNER ? 'active' : ''} onClick={() => setFilter(OWNER)}><i className="dot member-0" />{ownerFirst}</button>
      {colleagues.map(m => <button key={m.id} className={filter === m.id ? 'active' : ''} onClick={() => setFilter(m.id)}><i className={`dot ${colorOf(m.id)}`} />{m.name.split(' ')[0]}</button>)}
    </div>}
    <section className="panel calendar">
      <div className="calendar-head"><button className="icon-button" onClick={() => move(-1)} aria-label="Mês anterior"><ChevronLeft /></button><h2>{new Date(cursor.year, cursor.month, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</h2><button className="icon-button" onClick={() => move(1)} aria-label="Próximo mês"><ChevronRight /></button></div>
      <div className="calendar-week">{WEEKDAYS_SHORT.map(x => <span key={x}>{x}</span>)}</div>
      <div className="calendar-grid">{days.map((date, i) => {
        if (!date) return <span className="calendar-spacer" key={`gap-${i}`} />;
        const items = [...own(date).map(a => ({ id: a.id, time: a.time, label: a.title.split(' ')[0], cls: `chip-${a.kind} ${a.status}` })), ...team(date).map(a => ({ id: a.id, time: a.time, label: a.title.split(' ')[0], cls: `chip-team ${colorOf(a.memberId)}` }))].sort((a, b) => a.time.localeCompare(b.time));
        const requests = pendingByDay(date);
        return <button key={date} className={`calendar-day ${date === selected ? 'selected' : ''} ${date === today() ? 'today' : ''}`} onClick={() => setSelected(date)}>
          <strong>{fromIso(date).getDate()}</strong>
          {items.slice(0, 3).map(a => <small key={a.id} className={a.cls}>{a.time} {a.label}</small>)}
          {items.length > 3 && <small className="more">+{items.length - 3}</small>}
          {requests.length > 0 && <small className="chip-request">{requests.length} pedido(s)</small>}
          {blocksOf(date).length > 0 && <small className="chip-block">Bloqueio</small>}
        </button>;
      })}</div>
      <div className="calendar-legend"><span className="chip-session">Sessão</span><span className="chip-triage">Triagem</span><span className="chip-request">Pedido aguardando</span><span className="chip-block">Bloqueio</span>{shared && colleagues.map(m => <span key={m.id} className={`chip-team ${colorOf(m.id)}`}>{m.name.split(' ')[0]}</span>)}</div>
    </section>
    <Block title={formatLong(selected)} className="spaced">
      {selectedBlocks.map(b => <p key={b.id} className="block-inline">{shared && `${ownerFirst} · `}{b.allDay ? 'Dia inteiro bloqueado' : `Bloqueado das ${b.start} às ${b.end}`}{b.reason && !secretary ? ` · ${b.reason}` : ''}</p>)}
      {selectedPending.map(r => secretary
        ? <p key={r.id} className="request-inline">{r.requestedTime} · pedido de triagem de <b>{r.name}</b> aguardando {ownerFirst}</p>
        : <a key={r.id} className="request-inline" href={`/app/solicitacoes/detalhe/?id=${r.id}`}>{r.requestedTime} · pedido de triagem de <b>{r.name}</b> aguardando confirmação →</a>)}
      {[...selectedOwn.map(a => ({ key: a.id, time: a.time, node: <AppointmentRow key={a.id} appointment={a} data={data} update={update} owner={shared ? ownerFirst : undefined} /> })),
        ...selectedTeam.map(a => { const member = colleagues.find(m => m.id === a.memberId)!; return { key: a.id, time: a.time, node: <div key={a.id} className="appt-row">
          <div className="appt-time"><strong>{a.time}</strong></div>
          <span className="appt-who"><span className={`initials ${colorOf(a.memberId)}`}>{initials(a.title)}</span><span><strong>{a.title}</strong><small>Sessão · {a.minutes} min · {member.name.split(' ')[0]}{member.profession ? ` (${PROFESSIONS[member.profession].label})` : ''}</small></span></span>
          <Badge tone="scheduled">Marcada</Badge><div className="appt-actions" />
        </div> }; })]
        .sort((a, b) => a.time.localeCompare(b.time)).map(x => x.node)}
      {empty && <p className="muted">Nada marcado neste dia.</p>}
    </Block>
  </section>;
}
