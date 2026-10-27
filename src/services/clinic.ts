'use client';
import { useCallback, useEffect, useState } from 'react';
import { addDays, today } from '@/lib/dates';
import { PLANS, PlanId } from '@/config/plans';
import { buildSeed, buildTeamAppointments, demoAccount, demoProfessional, demoTeam } from '@/mocks/data';
import { ProfessionId, PROFESSIONS } from '@/config/professions';
import { AccountSettings, Appointment, AppointmentStatus, Patient, PatientStatus, Professional, Recurrence, SessionNote, TeamAppointment, TeamMember, TriageRequest } from '@/types';
import { findConflict, RECURRENCE_HORIZON_DAYS, recurringDates } from './scheduling';
import { supabase } from '@/lib/supabase';

/**
 * Estado do protótipo. Por enquanto fica no localStorage do navegador; cada
 * operação abaixo é uma função pura sobre `ClinicData`, para que a troca por
 * Supabase aconteça só nesta camada.
 */
export interface ClinicData {
  professional: Professional;
  account: AccountSettings;
  /** Plano em uso (no modo demonstração, escolhido na tela de Assinatura). */
  plan: PlanId;
  team: TeamMember[];
  teamAppointments: TeamAppointment[];
  /** Demonstração: ver o painel como a secretária (id do membro) ou como a profissional. */
  viewAs?: string;
  requests: TriageRequest[];
  patients: Patient[];
  appointments: Appointment[];
  notes: SessionNote[];
  /** Conta real: o aviso de boas-vindas do plano Grátis já foi visto. */
  welcomeSeen?: boolean;
}

/** Resultado das operações que podem ser recusadas por conflito de horário. */
export type Outcome<T = undefined> = { error?: string; value?: T };

const DEMO_KEY = 'casozero-saude-v1';
const EVENT = 'casozero-saude-change';
/** Evento disparado quando uma gravação no Supabase falha (o painel mostra o aviso). */
export const SYNC_ERROR_EVENT = 'casozero-saude-sync-error';

/** Usuário do Supabase dono dos dados. Sem ele, o app está em modo demonstração. */
export interface ClinicOwner { id: string; email?: string; metadata: Record<string, unknown>; }
let owner: ClinicOwner | null = null;

/* ---- Conta real: estado em memória, lido e gravado no Supabase ---- */
let remote: ClinicData | null = null;
let remoteLoading: Promise<void> | null = null;
let writes: Promise<void> = Promise.resolve();
let pendingWrites = 0;

const emit = () => window.dispatchEvent(new Event(EVENT));
const emitError = (message: string) => window.dispatchEvent(new CustomEvent(SYNC_ERROR_EVENT, { detail: message }));

/** Apaga cópias antigas de pacientes e caderneta guardadas no navegador antes da migração. */
function clearLegacyLocalData() {
  try {
    for (const key of Object.keys(window.localStorage)) if (key.startsWith(`${DEMO_KEY}:`) || key === 'casozero-saude-owner') window.localStorage.removeItem(key);
  } catch { /* ignore */ }
}

async function loadRemote(user: ClinicOwner) {
  const { fetchClinic, persistDiff } = await import('./remote');
  const fetched = await fetchClinic(user, () => buildBlank(user));
  if (owner?.id !== user.id) return;
  // Sessões recorrentes dos próximos dias entram na agenda e são gravadas.
  const rolled = structuredClone(fetched);
  rollRecurrences(rolled);
  remote = rolled;
  emit();
  if (JSON.stringify(rolled.appointments) !== JSON.stringify(fetched.appointments)) queueWrite(fetched, rolled, persistDiff);
}

function queueWrite(before: ClinicData, after: ClinicData, persist?: typeof import('./remote').persistDiff) {
  const user = owner;
  if (!user) return;
  pendingWrites++;
  writes = writes.then(async () => {
    const { persistDiff, describeError } = await import('./remote');
    try {
      const patched = await (persist ?? persistDiff)(before, after, user.id);
      if (remote && Object.keys(patched).length) { remote.professional = { ...remote.professional, ...patched }; emit(); }
    } catch (error) {
      emitError(describeError(error));
      // Volta ao que está de fato no banco.
      try { remote = null; await loadRemote(user); } catch { /* o aviso já foi mostrado */ }
    } finally { pendingWrites--; }
  });
}

/** Busca de novo no banco (pedidos novos do link público), se não houver gravação em andamento. */
export function refreshClinic() {
  if (!owner || !supabase || pendingWrites > 0 || !remote) return;
  const user = owner;
  loadRemote(user).catch(() => { /* mantém o que já está na tela */ });
}

/** Espera as gravações pendentes (usar antes de trocar de página). */
export function flushClinic() { return writes; }

/** Liga o painel à conta logada. Com Supabase, os dados vêm do banco. */
export function setClinicOwner(next: ClinicOwner | null) {
  const changed = owner?.id !== next?.id;
  owner = next;
  if (!changed) return;
  remote = null;
  if (next && supabase) {
    clearLegacyLocalData();
    remoteLoading = loadRemote(next).catch(async error => {
      const { describeError } = await import('./remote');
      emitError(describeError(error));
    });
  }
  emit();
}

const isRemote = () => Boolean(owner && supabase);
const isRealAccount = () => Boolean(owner);

const text = (value: unknown) => typeof value === 'string' && value.trim() ? value.trim() : undefined;
const list = (value: unknown) => Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : [];

/** Conta nova: perfil vindo do cadastro, agenda vazia e plano Grátis. Nada fictício. */
export function buildBlank(user: ClinicOwner): ClinicData {
  const m = user.metadata;
  const profession = (text(m.profession) && text(m.profession)! in PROFESSIONS ? text(m.profession) : 'psicologia') as ProfessionId;
  const name = text(m.full_name) ?? user.email?.split('@')[0] ?? 'Profissional';
  const modality = m.modality === 'online' || m.modality === 'presencial' ? m.modality : 'ambos';
  return {
    professional: {
      slug: slugify(name), name, profession,
      councilNumber: text(m.council_number), specialties: list(m.specialties), categories: list(m.categories),
      modality, city: text(m.city), services: [],
      bookingTitle: 'O que você procura?', bookingIntro: '',
      availability: { ...structuredClone(demoProfessional.availability), blocks: [] },
    },
    account: { ...structuredClone(demoAccount), email: user.email ?? '', phone: text(m.phone) ?? '', remindPatients: false },
    plan: 'gratis', team: [], teamAppointments: [],
    requests: [], patients: [], appointments: [], notes: [],
    welcomeSeen: false,
  };
}
export const uid = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

/** Completa dados salvos por versões anteriores do protótipo. */
function migrate(data: ClinicData) {
  const p = data.professional as Professional & { availability: { blockedDates?: string[] } };
  if (!p.availability.blocks) p.availability.blocks = (p.availability.blockedDates ?? []).map(date => ({ id: uid(), date, allDay: true, start: '08:00', end: '18:00' }));
  delete p.availability.blockedDates;
  p.services ??= structuredClone(demoProfessional.services);
  p.bookingTitle ??= demoProfessional.bookingTitle;
  p.bookingIntro ??= p.bio ?? demoProfessional.bookingIntro;
  data.account ??= structuredClone(demoAccount);
  data.plan = data.plan in PLANS ? data.plan : 'gratis';
  const real = isRealAccount();
  data.team ??= real ? [] : structuredClone(demoTeam);
  data.teamAppointments ??= real ? [] : buildTeamAppointments();
}

/** Estado atual (cópia). Conta real: o que veio do banco; demonstração: o navegador. */
export function loadClinic(): ClinicData {
  if (isRemote()) {
    if (!remote) throw new Error('Dados ainda carregando');
    return structuredClone(remote);
  }
  let data: ClinicData | null = null;
  try { const saved = window.localStorage.getItem(DEMO_KEY); if (saved) data = JSON.parse(saved); } catch { /* volta para o início */ }
  if (!data?.professional) data = owner ? buildBlank(owner) : buildSeed();
  migrate(data);
  rollRecurrences(data);
  return data;
}

/** Salva. Conta real: atualiza na hora e grava no Supabase em segundo plano. */
export function saveClinic(data: ClinicData) {
  if (isRemote()) {
    if (!remote) return false;
    const before = remote;
    remote = structuredClone(data);
    queueWrite(before, remote);
    emit();
    return true;
  }
  let ok = true;
  try { window.localStorage.setItem(DEMO_KEY, JSON.stringify(data)); } catch { ok = false; }
  emit();
  return ok;
}

/** Só no modo demonstração: volta aos dados de exemplo. */
export function resetClinic() {
  if (isRemote()) return;
  try { window.localStorage.removeItem(DEMO_KEY); } catch { /* ignore */ }
  emit();
}

/** Hook do estado da clínica (painel). Conta real: espera o banco carregar. */
export function useClinic() {
  const [data, setData] = useState<ClinicData | null>(null);
  useEffect(() => {
    const refresh = () => { if (isRemote() && !remote) { setData(null); return; } setData(loadClinic()); };
    refresh();
    const onStorage = (e: StorageEvent) => { if (!isRemote() && (e.key === DEMO_KEY || e.key === null)) refresh(); };
    const beforeUnload = (e: BeforeUnloadEvent) => { if (pendingWrites > 0) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('storage', onStorage);
    window.addEventListener(EVENT, refresh);
    window.addEventListener('beforeunload', beforeUnload);
    const onVisible = () => { if (document.visibilityState === 'visible') refreshClinic(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { window.removeEventListener('storage', onStorage); window.removeEventListener(EVENT, refresh); window.removeEventListener('beforeunload', beforeUnload); document.removeEventListener('visibilitychange', onVisible); };
  }, []);
  const update = useCallback(<R,>(change: (draft: ClinicData) => R): R => {
    const draft = loadClinic();
    const result = change(draft);
    // Operação recusada: não grava nada.
    if (result && typeof result === 'object' && 'error' in result && result.error) return result;
    if (!saveClinic(draft)) return { error: 'Não foi possível salvar: o armazenamento do navegador está cheio. Use imagens menores.' } as R;
    setData(draft);
    return result;
  }, []);
  return { data, update };
}

/** Para a página pública da demonstração (sem Supabase) continuar lendo o navegador. */
export function hasRemoteAccount() { return Boolean(supabase); }
void remoteLoading;

/* ------------------------------------------------------------------ */
/* Pedidos de triagem                                                  */
/* ------------------------------------------------------------------ */

export type NewRequest = Omit<TriageRequest, 'id' | 'status' | 'createdAt'>;

export function submitRequest(data: ClinicData, input: NewRequest): Outcome<TriageRequest> {
  const taken = data.requests.some(r => r.status === 'pending' && r.requestedDate === input.requestedDate && r.requestedTime === input.requestedTime);
  const conflict = findConflict(data.professional, data.appointments, input.requestedDate, input.requestedTime, data.professional.availability.triageMinutes);
  if (taken || conflict) return { error: 'Esse horário acabou de ser reservado. Escolha outro, por favor.' };
  const trackToken = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
  const request: TriageRequest = { ...input, id: uid(), status: 'pending', createdAt: new Date().toISOString(), trackToken };
  data.requests.unshift(request);
  return { value: request };
}

export function confirmRequest(data: ClinicData, id: string, date: string, time: string): Outcome {
  const request = data.requests.find(r => r.id === id);
  if (!request) return { error: 'Solicitação não encontrada.' };
  const minutes = data.professional.availability.triageMinutes;
  const conflict = findConflict(data.professional, data.appointments, date, time, minutes, a => a.requestId === id && a.kind === 'triage');
  if (conflict) return { error: `${conflict} Escolha outro horário para a triagem.` };
  data.appointments = data.appointments.filter(a => !(a.requestId === id && a.kind === 'triage'));
  // Com chave PIX configurada, a vaga só é firmada depois do sinal.
  request.status = data.account.pixKey ? 'awaiting_payment' : 'confirmed';
  request.scheduledDate = date;
  request.scheduledTime = time;
  data.appointments.push({ id: uid(), kind: 'triage', date, time, minutes, status: 'scheduled', requestId: id, title: request.name });
  return {};
}

/** A profissional não pode atender na data pedida e sugere outro horário; o paciente aceita pelo link. */
export function proposeSlot(data: ClinicData, id: string, date: string, time: string): Outcome {
  const request = data.requests.find(r => r.id === id);
  if (!request) return { error: 'Solicitação não encontrada.' };
  const minutes = data.professional.availability.triageMinutes;
  const conflict = findConflict(data.professional, data.appointments, date, time, minutes, a => a.requestId === id && a.kind === 'triage');
  if (conflict) return { error: `${conflict} Escolha outro horário para sugerir.` };
  // O horário anterior sai da agenda; só entra de novo quando o paciente aceitar.
  data.appointments = data.appointments.filter(a => !(a.requestId === id && a.kind === 'triage'));
  request.status = 'proposed';
  request.proposedDate = date;
  request.proposedTime = time;
  return {};
}

/** A profissional confirma que o sinal caiu na conta. */
export function confirmPayment(data: ClinicData, id: string): Outcome {
  const request = data.requests.find(r => r.id === id);
  if (!request) return { error: 'Solicitação não encontrada.' };
  if (request.status !== 'awaiting_payment') return { error: 'Esta solicitação não está aguardando pagamento.' };
  request.status = 'confirmed';
  request.paidAt = new Date().toISOString();
  return {};
}

export function declineRequest(data: ClinicData, id: string, reason: string) {
  const request = data.requests.find(r => r.id === id);
  if (!request) return;
  request.status = 'declined';
  request.declineReason = reason;
  data.appointments = data.appointments.filter(a => !(a.requestId === id && a.kind === 'triage' && a.status === 'scheduled'));
}

export interface TriageOutcome { continues: boolean; note: string; recurrence?: Recurrence; }

/** Fecha a triagem: vira paciente com horário fixo ou é encerrada. */
export function completeTriage(data: ClinicData, id: string, outcome: TriageOutcome): Outcome<Patient> {
  const request = data.requests.find(r => r.id === id);
  if (!request) return { error: 'Solicitação não encontrada.' };
  const triage = data.appointments.find(a => a.requestId === id && a.kind === 'triage');
  if (outcome.continues && outcome.recurrence) {
    const limit = patientLimitError(data);
    if (limit) return { error: limit };
    const conflict = recurrenceConflict(data, outcome.recurrence);
    if (conflict) return { error: conflict };
  }
  if (triage) triage.status = 'done';
  if (!outcome.continues || !outcome.recurrence) {
    request.status = 'not_continued';
    request.outcomeNote = outcome.note;
    return {};
  }
  const patient: Patient = {
    id: uid(), requestId: id, name: request.name, age: request.age, phone: request.phone, email: request.email, guardianName: request.guardianName,
    category: request.category, concern: request.concern, expectation: request.expectation,
    status: 'active', recurrence: outcome.recurrence, createdAt: new Date().toISOString(),
  };
  data.patients.unshift(patient);
  request.status = 'continued';
  request.patientId = patient.id;
  if (triage) triage.patientId = patient.id;
  data.notes.push({ id: uid(), patientId: patient.id, appointmentId: triage?.id, number: 0, date: triage?.date ?? today(), notes: outcome.note, evolution: 'Triagem realizada. Início do acompanhamento.', updatedAt: new Date().toISOString() });
  scheduleRecurring(data, patient, outcome.recurrence.startDate);
  return { value: patient };
}

/* ------------------------------------------------------------------ */
/* Pacientes e agenda recorrente                                       */
/* ------------------------------------------------------------------ */

/** Erro quando o plano não comporta mais um paciente. Conta todos os cadastrados: dar alta não libera vaga. */
export function patientLimitError(data: ClinicData) {
  const limit = PLANS[data.plan].maxPatients;
  if (limit !== undefined && data.patients.length >= limit) return `Você chegou ao limite de ${limit} pacientes do plano ${PLANS[data.plan].name}. Para cadastrar novos pacientes, mude para o plano Profissional.`;
}

/** Primeiro choque de um horário fixo com a agenda, nas datas que seriam lançadas. */
function recurrenceConflict(data: ClinicData, recurrence: Recurrence, patientId?: string) {
  const from = recurrence.startDate > today() ? recurrence.startDate : today();
  const minutes = data.professional.availability.sessionMinutes;
  const clashes = recurringDates(recurrence, from, addDays(today(), RECURRENCE_HORIZON_DAYS))
    // Bloqueios (folgas) não impedem o horário fixo: a sessão daquele dia só não é lançada.
    .map(date => findConflict(data.professional, data.appointments, date, recurrence.time, minutes, a => a.patientId === patientId && a.kind === 'session' && a.status === 'scheduled', false))
    .filter(Boolean);
  if (clashes.length) return `Esse horário fixo bate com ${clashes.length} compromisso(s). Primeiro: ${clashes[0]}`;
}

function scheduleRecurring(data: ClinicData, patient: Patient, from: string) {
  if (!patient.recurrence || patient.status !== 'active') return;
  const until = addDays(today(), RECURRENCE_HORIZON_DAYS);
  const minutes = data.professional.availability.sessionMinutes;
  const taken = new Set(data.appointments.filter(a => a.patientId === patient.id && a.kind === 'session').map(a => a.date));
  for (const date of recurringDates(patient.recurrence, from, until)) {
    // Nunca sobrepõe: se outro compromisso ou bloqueio ocupou o horário, a data fica de fora.
    if (taken.has(date) || findConflict(data.professional, data.appointments, date, patient.recurrence.time, minutes)) continue;
    data.appointments.push({ id: uid(), kind: 'session', date, time: patient.recurrence.time, minutes, status: 'scheduled', patientId: patient.id, title: patient.name });
  }
}

/** Mantém a agenda dos pacientes ativos preenchida até o horizonte. */
function rollRecurrences(data: ClinicData) {
  const start = today();
  for (const patient of data.patients) scheduleRecurring(data, patient, start);
}

const removeFutureSessions = (data: ClinicData, patientId: string, from: string) => {
  data.appointments = data.appointments.filter(a => !(a.patientId === patientId && a.kind === 'session' && a.status === 'scheduled' && a.date >= from));
};

export function changeRecurrence(data: ClinicData, patientId: string, recurrence: Recurrence): Outcome {
  const patient = data.patients.find(p => p.id === patientId);
  if (!patient) return { error: 'Paciente não encontrado.' };
  const conflict = recurrenceConflict(data, recurrence, patientId);
  if (conflict) return { error: conflict };
  removeFutureSessions(data, patientId, today() > recurrence.startDate ? today() : recurrence.startDate);
  patient.recurrence = recurrence;
  scheduleRecurring(data, patient, recurrence.startDate > today() ? recurrence.startDate : today());
  return {};
}

/** E-mail do paciente para os lembretes (vazio remove). */
export const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
export function setPatientEmail(data: ClinicData, patientId: string, email: string): Outcome {
  const patient = data.patients.find(p => p.id === patientId);
  if (!patient) return { error: 'Paciente não encontrado.' };
  const value = email.trim().toLowerCase();
  if (value && !isEmail(value)) return { error: 'Confira o e-mail: use o formato nome@exemplo.com.' };
  patient.email = value || undefined;
  return {};
}

export function setPatientStatus(data: ClinicData, patientId: string, status: PatientStatus): Outcome {
  const patient = data.patients.find(p => p.id === patientId);
  if (!patient) return { error: 'Paciente não encontrado.' };
  patient.status = status;
  if (status === 'active') scheduleRecurring(data, patient, today());
  else removeFutureSessions(data, patientId, today());
  return {};
}

export function addExtraSession(data: ClinicData, patientId: string, date: string, time: string): Outcome<Appointment> {
  const patient = data.patients.find(p => p.id === patientId);
  if (!patient) return { error: 'Paciente não encontrado.' };
  const minutes = data.professional.availability.sessionMinutes;
  const conflict = findConflict(data.professional, data.appointments, date, time, minutes);
  if (conflict) return { error: conflict };
  const appointment: Appointment = { id: uid(), kind: 'session', date, time, minutes, status: 'scheduled', patientId, title: patient.name };
  data.appointments.push(appointment);
  return { value: appointment };
}

export function setAppointmentStatus(data: ClinicData, appointmentId: string, status: AppointmentStatus) {
  const appointment = data.appointments.find(a => a.id === appointmentId);
  if (!appointment) return;
  appointment.status = status;
  if (status === 'done' && appointment.kind === 'session') return ensureNote(data, appointmentId);
}

/* ------------------------------------------------------------------ */
/* Caderneta                                                           */
/* ------------------------------------------------------------------ */

/** Abre (ou cria) a página da caderneta de uma sessão, numerada em ordem cronológica. */
export function ensureNote(data: ClinicData, appointmentId: string) {
  const existing = data.notes.find(n => n.appointmentId === appointmentId);
  if (existing) return existing;
  const appointment = data.appointments.find(a => a.id === appointmentId);
  if (!appointment?.patientId) return;
  if (appointment.status === 'scheduled') appointment.status = 'done';
  const numbered = data.notes.filter(n => n.patientId === appointment.patientId && n.number > 0);
  const before = numbered.filter(n => n.date <= appointment.date).length;
  // Sessões registradas depois desta data andam uma posição.
  for (const note of numbered) if (note.date > appointment.date) note.number += 1;
  const note: SessionNote = { id: uid(), patientId: appointment.patientId, appointmentId, number: before + 1, date: appointment.date, notes: '', evolution: '', updatedAt: new Date().toISOString() };
  data.notes.push(note);
  return note;
}

export function saveNote(data: ClinicData, noteId: string, values: Pick<SessionNote, 'notes' | 'evolution'>) {
  const note = data.notes.find(n => n.id === noteId);
  if (!note) return;
  Object.assign(note, values, { updatedAt: new Date().toISOString() });
}

/* ------------------------------------------------------------------ */
/* Perfil e conta                                                      */
/* ------------------------------------------------------------------ */

export function saveProfessional(data: ClinicData, values: Partial<Professional>) {
  data.professional = { ...data.professional, ...values };
}

export function setPlan(data: ClinicData, plan: PlanId) {
  data.plan = plan;
  if (!PLANS[plan].team) data.viewAs = undefined;
}

export function saveTeam(data: ClinicData, team: TeamMember[]) {
  data.team = team;
  if (data.viewAs && !team.some(m => m.id === data.viewAs && m.role === 'secretary')) data.viewAs = undefined;
}

export function setViewAs(data: ClinicData, memberId?: string) { data.viewAs = memberId; }

export function markWelcomeSeen(data: ClinicData) { data.welcomeSeen = true; }

export function saveAccount(data: ClinicData, values: Partial<AccountSettings>) {
  data.account = { ...data.account, ...values };
}

export const slugify = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '').slice(0, 40) || 'profissional';
/** Slug com hífens, usado nos links por demanda. */
export const slugifyTopic = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Demonstração do plano Clínica: o painel está sendo visto pela secretária. */
export const viewingAsSecretary = (data: ClinicData) => Boolean(data.viewAs && PLANS[data.plan].team && data.team.some(m => m.id === data.viewAs && m.role === 'secretary'));
