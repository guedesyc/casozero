import { parseMoney } from '@/config/plans';
import { Appointment, Patient } from '@/types';
import type { ClinicData } from './clinic';
import { isPast } from './scheduling';

/** Situação de um atendimento para o Financeiro. */
export type FinanceState = 'done' | 'planned' | 'unrecorded' | 'missed';
export interface FinanceLine { appointment: Appointment; value?: number; state: FinanceState }
export interface PatientFinance { patient: Patient; price?: number; done: number; planned: number; missed: number; received: number; expected: number }

/** Valor da sessão: o do paciente ou, sem ele, o padrão da conta. */
export const sessionPriceOf = (data: ClinicData, patientId?: string) =>
  data.patients.find(p => p.id === patientId)?.sessionPrice ?? parseMoney(data.account.sessionPrice);

/** Valor da triagem: preço do serviço escolhido no pedido ou, sem ele, o padrão da conta. */
export function triagePriceOf(data: ClinicData, requestId?: string) {
  const service = data.requests.find(r => r.id === requestId)?.service?.trim();
  const price = service ? data.professional.services.find(s => s.name.trim() === service)?.price : undefined;
  return parseMoney(price) ?? parseMoney(data.account.triagePrice);
}

const stateOf = (a: Appointment): FinanceState =>
  a.status === 'done' ? 'done' : a.status === 'missed' ? 'missed' : isPast(a.date, a.time) ? 'unrecorded' : 'planned';

/**
 * Resumo de um mês ("2026-10"): realizados entram como recebido, marcados como a receber.
 * Faltas e cancelados não entram; atendimentos que já passaram sem registro contam como a receber.
 */
export function monthFinance(data: ClinicData, month: string) {
  const lines: FinanceLine[] = data.appointments
    .filter(a => a.date.startsWith(month) && a.status !== 'canceled')
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))
    .map(a => ({ appointment: a, value: a.kind === 'triage' ? triagePriceOf(data, a.requestId) : sessionPriceOf(data, a.patientId), state: stateOf(a) }));
  const sum = (items: FinanceLine[]) => items.reduce((total, l) => total + (l.value ?? 0), 0);
  const done = lines.filter(l => l.state === 'done');
  const open = lines.filter(l => l.state === 'planned' || l.state === 'unrecorded');
  const missed = lines.filter(l => l.state === 'missed');

  const byPatient = new Map<string, PatientFinance>();
  for (const l of lines) {
    if (l.appointment.kind !== 'session' || !l.appointment.patientId) continue;
    const patient = data.patients.find(p => p.id === l.appointment.patientId);
    if (!patient) continue;
    const row = byPatient.get(patient.id) ?? { patient, price: l.value, done: 0, planned: 0, missed: 0, received: 0, expected: 0 };
    if (l.state === 'done') { row.done++; row.received += l.value ?? 0; }
    else if (l.state === 'missed') row.missed++;
    else { row.planned++; row.expected += l.value ?? 0; }
    byPatient.set(patient.id, row);
  }

  return {
    lines,
    received: sum(done),
    expected: sum(open),
    missedCount: missed.length,
    missedValue: sum(missed),
    unrecorded: lines.filter(l => l.state === 'unrecorded').length,
    withoutPrice: lines.filter(l => l.value === undefined && l.state !== 'missed').length,
    triages: lines.filter(l => l.appointment.kind === 'triage'),
    patients: [...byPatient.values()].sort((a, b) => a.patient.name.localeCompare(b.patient.name, 'pt-BR')),
  };
}
