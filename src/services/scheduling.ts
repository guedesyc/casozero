import { addDays, at, iso, today, toMinutes, toTime, weekdayOf } from '@/lib/dates';
import { Appointment, Professional, Recurrence, TriageRequest } from '@/types';

const overlaps = (aStart: number, aMinutes: number, bStart: number, bMinutes: number) => aStart < bStart + bMinutes && bStart < aStart + aMinutes;

/**
 * Horários livres para triagem em uma data: a janela do dia fatiada pela
 * duração da triagem, sem os compromissos já marcados, sem os pedidos ainda
 * pendentes e respeitando a antecedência mínima.
 */
export function freeSlots(professional: Professional, appointments: Appointment[], requests: TriageRequest[], date: string, now = new Date()): string[] {
  const { availability } = professional;
  if (availability.blockedDates.includes(date)) return [];
  const window = availability.windows.find(w => w.weekday === weekdayOf(date));
  if (!window?.enabled) return [];
  const length = availability.triageMinutes;
  const busy = [
    ...appointments.filter(a => a.date === date && a.status !== 'canceled').map(a => ({ start: toMinutes(a.time), minutes: a.minutes })),
    ...requests.filter(r => r.status === 'pending' && r.requestedDate === date).map(r => ({ start: toMinutes(r.requestedTime), minutes: length })),
  ];
  const earliest = now.getTime() + availability.minNoticeHours * 3_600_000;
  const slots: string[] = [];
  for (let start = toMinutes(window.start); start + length <= toMinutes(window.end); start += length) {
    if (busy.some(b => overlaps(start, length, b.start, b.minutes))) continue;
    if (at(date, toTime(start)).getTime() < earliest) continue;
    slots.push(toTime(start));
  }
  return slots;
}

/** Datas, dentro do horizonte configurado, que têm ao menos um horário livre. */
export function availableDates(professional: Professional, appointments: Appointment[], requests: TriageRequest[], now = new Date()): Set<string> {
  const start = iso(now);
  const dates = new Set<string>();
  for (let i = 0; i <= professional.availability.horizonDays; i++) {
    const date = addDays(start, i);
    if (freeSlots(professional, appointments, requests, date, now).length) dates.add(date);
  }
  return dates;
}

/** Datas de uma recorrência a partir de `from` até `until` (inclusive). */
export function recurringDates(recurrence: Recurrence, from: string, until: string): string[] {
  let first = recurrence.startDate > from ? recurrence.startDate : from;
  while (weekdayOf(first) !== recurrence.weekday) first = addDays(first, 1);
  const step = recurrence.frequency === 'weekly' ? 7 : 14;
  // Mantém o ritmo quinzenal alinhado com a data de início.
  if (step === 14) {
    let anchor = recurrence.startDate;
    while (weekdayOf(anchor) !== recurrence.weekday) anchor = addDays(anchor, 1);
    const diff = Math.round((new Date(`${first}T12:00:00`).getTime() - new Date(`${anchor}T12:00:00`).getTime()) / 86_400_000);
    if (diff % 14 !== 0) first = addDays(first, 7);
  }
  const dates: string[] = [];
  for (let date = first; date <= until; date = addDays(date, step)) dates.push(date);
  return dates;
}

/** Quantos dias à frente as sessões recorrentes são lançadas na agenda. */
export const RECURRENCE_HORIZON_DAYS = 90;

export const isPast = (date: string, time: string) => at(date, time).getTime() < Date.now();
export const isToday = (date: string) => date === today();
