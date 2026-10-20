'use client';
import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatLong, fromIso, monthGrid, today, WEEKDAYS_SHORT } from '@/lib/dates';

export interface Slot { date: string; time: string; }

/** Calendário mensal: só os dias em `available` podem ser escolhidos; ao escolher um dia, mostra os horários. */
export function SlotPicker({ available, slotsFor, value, onChange }: { available: Set<string>; slotsFor: (date: string) => string[]; value?: Slot; onChange: (slot: Slot) => void }) {
  const firstAvailable = useMemo(() => [...available].sort()[0], [available]);
  const start = fromIso(value?.date ?? firstAvailable ?? today());
  const [cursor, setCursor] = useState({ year: start.getFullYear(), month: start.getMonth() });
  const [day, setDay] = useState<string | undefined>(value?.date ?? firstAvailable);
  const days = monthGrid(cursor.year, cursor.month);
  const label = new Date(cursor.year, cursor.month, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const move = (delta: number) => { const d = new Date(cursor.year, cursor.month + delta, 1); setCursor({ year: d.getFullYear(), month: d.getMonth() }); };
  const slots = day ? slotsFor(day) : [];
  if (!available.size) return <p className="muted">Nenhum horário disponível nos próximos dias. Tente novamente mais tarde.</p>;
  return <div className="slot-picker">
    <div className="slot-calendar">
      <div className="slot-head"><button type="button" className="icon-button" onClick={() => move(-1)} aria-label="Mês anterior"><ChevronLeft size={18} /></button><strong>{label}</strong><button type="button" className="icon-button" onClick={() => move(1)} aria-label="Próximo mês"><ChevronRight size={18} /></button></div>
      <div className="slot-week">{WEEKDAYS_SHORT.map(d => <span key={d}>{d}</span>)}</div>
      <div className="slot-days">{days.map((date, i) => date
        ? <button type="button" key={date} disabled={!available.has(date)} className={`${date === day ? 'selected' : ''} ${date === today() ? 'today' : ''}`} onClick={() => setDay(date)}>{fromIso(date).getDate()}</button>
        : <span key={`gap-${i}`} />)}</div>
    </div>
    <div className="slot-times">
      {day ? <><p className="slot-day">{formatLong(day)}</p>
        {slots.length ? <div className="slot-grid">{slots.map(time => <button type="button" key={time} className={value?.date === day && value.time === time ? 'selected' : ''} onClick={() => onChange({ date: day, time })}>{time}</button>)}</div> : <p className="muted">Sem horários livres neste dia.</p>}</>
        : <p className="muted">Escolha um dia destacado no calendário.</p>}
    </div>
  </div>;
}
