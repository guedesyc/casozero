'use client';
import { useCallback, useEffect, useState } from 'react';
import { addDays, today } from '@/lib/dates';
import { buildSeed } from '@/mocks/data';
import { Appointment, AppointmentStatus, Patient, PatientStatus, Professional, Recurrence, SessionNote, TriageRequest } from '@/types';
import { RECURRENCE_HORIZON_DAYS, recurringDates } from './scheduling';

/**
 * Estado do protótipo. Por enquanto fica no localStorage do navegador; cada
 * operação abaixo é uma função pura sobre `ClinicData`, para que a troca por
 * Supabase aconteça só nesta camada.
 */
export interface ClinicData {
  professional: Professional;
  requests: TriageRequest[];
  patients: Patient[];
  appointments: Appointment[];
  notes: SessionNote[];
}

const KEY = 'casozero-saude-v1';
const EVENT = 'casozero-saude-change';
const uid = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

export function loadClinic(): ClinicData {
  let data: ClinicData | null = null;
  try { const saved = window.localStorage.getItem(KEY); if (saved) data = JSON.parse(saved); } catch { /* volta para a demonstração */ }
  if (!data?.professional) data = buildSeed();
  rollRecurrences(data);
  return data;
}

export function saveClinic(data: ClinicData) {
  try { window.localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* sem armazenamento disponível */ }
  window.dispatchEvent(new Event(EVENT));
}

export function resetClinic() { try { window.localStorage.removeItem(KEY); } catch { /* ignore */ } window.dispatchEvent(new Event(EVENT)); }

/** Hook do estado da clínica, sincronizado entre abas (link público ↔ painel). */
export function useClinic() {
  const [data, setData] = useState<ClinicData | null>(null);
  useEffect(() => {
    const refresh = () => setData(loadClinic());
    refresh();
    const onStorage = (e: StorageEvent) => { if (e.key === KEY || e.key === null) refresh(); };
    window.addEventListener('storage', onStorage);
    window.addEventListener(EVENT, refresh);
    return () => { window.removeEventListener('storage', onStorage); window.removeEventListener(EVENT, refresh); };
  }, []);
  const update = useCallback(<R,>(change: (draft: ClinicData) => R): R => {
    const draft = loadClinic();
    const result = change(draft);
    saveClinic(draft);
    setData(draft);
    return result;
  }, []);
  return { data, update };
}

/* ------------------------------------------------------------------ */
/* Pedidos de triagem                                                  */
/* ------------------------------------------------------------------ */

export type NewRequest = Omit<TriageRequest, 'id' | 'status' | 'createdAt'>;

export function submitRequest(data: ClinicData, input: NewRequest) {
  const request: TriageRequest = { ...input, id: uid(), status: 'pending', createdAt: new Date().toISOString() };
  data.requests.unshift(request);
  return request;
}

export function confirmRequest(data: ClinicData, id: string, date: string, time: string) {
  const request = data.requests.find(r => r.id === id);
  if (!request) return;
  data.appointments = data.appointments.filter(a => !(a.requestId === id && a.kind === 'triage'));
  request.status = 'confirmed';
  request.scheduledDate = date;
  request.scheduledTime = time;
  data.appointments.push({ id: uid(), kind: 'triage', date, time, minutes: data.professional.availability.triageMinutes, status: 'scheduled', requestId: id, title: request.name });
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
export function completeTriage(data: ClinicData, id: string, outcome: TriageOutcome) {
  const request = data.requests.find(r => r.id === id);
  if (!request) return;
  const triage = data.appointments.find(a => a.requestId === id && a.kind === 'triage');
  if (triage) triage.status = 'done';
  if (!outcome.continues || !outcome.recurrence) {
    request.status = 'not_continued';
    request.outcomeNote = outcome.note;
    return;
  }
  const patient: Patient = {
    id: uid(), requestId: id, name: request.name, age: request.age, phone: request.phone, guardianName: request.guardianName,
    category: request.category, concern: request.concern, expectation: request.expectation,
    status: 'active', recurrence: outcome.recurrence, createdAt: new Date().toISOString(),
  };
  data.patients.unshift(patient);
  request.status = 'continued';
  request.patientId = patient.id;
  if (triage) triage.patientId = patient.id;
  data.notes.push({ id: uid(), patientId: patient.id, appointmentId: triage?.id, number: 0, date: triage?.date ?? today(), notes: outcome.note, evolution: 'Triagem realizada. Início do acompanhamento.', updatedAt: new Date().toISOString() });
  scheduleRecurring(data, patient, outcome.recurrence.startDate);
  return patient;
}

/* ------------------------------------------------------------------ */
/* Pacientes e agenda recorrente                                       */
/* ------------------------------------------------------------------ */

function scheduleRecurring(data: ClinicData, patient: Patient, from: string) {
  if (!patient.recurrence || patient.status !== 'active') return;
  const until = addDays(today(), RECURRENCE_HORIZON_DAYS);
  const taken = new Set(data.appointments.filter(a => a.patientId === patient.id && a.kind === 'session').map(a => a.date));
  for (const date of recurringDates(patient.recurrence, from, until)) {
    if (taken.has(date)) continue;
    data.appointments.push({ id: uid(), kind: 'session', date, time: patient.recurrence.time, minutes: data.professional.availability.sessionMinutes, status: 'scheduled', patientId: patient.id, title: patient.name });
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

export function changeRecurrence(data: ClinicData, patientId: string, recurrence: Recurrence) {
  const patient = data.patients.find(p => p.id === patientId);
  if (!patient) return;
  removeFutureSessions(data, patientId, today() > recurrence.startDate ? today() : recurrence.startDate);
  patient.recurrence = recurrence;
  scheduleRecurring(data, patient, recurrence.startDate > today() ? recurrence.startDate : today());
}

export function setPatientStatus(data: ClinicData, patientId: string, status: PatientStatus) {
  const patient = data.patients.find(p => p.id === patientId);
  if (!patient) return;
  patient.status = status;
  if (status === 'active') scheduleRecurring(data, patient, today());
  else removeFutureSessions(data, patientId, today());
}

export function addExtraSession(data: ClinicData, patientId: string, date: string, time: string) {
  const patient = data.patients.find(p => p.id === patientId);
  if (!patient) return;
  const appointment: Appointment = { id: uid(), kind: 'session', date, time, minutes: data.professional.availability.sessionMinutes, status: 'scheduled', patientId, title: patient.name };
  data.appointments.push(appointment);
  return appointment;
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
  const before = numbered.filter(n => `${n.date}` <= appointment.date).length;
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
/* Perfil                                                              */
/* ------------------------------------------------------------------ */

export function saveProfessional(data: ClinicData, values: Partial<Professional>) {
  data.professional = { ...data.professional, ...values };
}

export const slugify = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '').slice(0, 40) || 'profissional';
