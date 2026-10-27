'use client';
import { supabase } from '@/lib/supabase';
import { toPlanId } from '@/config/plans';
import { addDays, iso } from '@/lib/dates';
import { AccountSettings, Appointment, Patient, Professional, RequestStatus, SessionNote, TeamMember, TriageRequest } from '@/types';
import type { ClinicData, ClinicOwner, NewRequest, Outcome } from './clinic';

/**
 * Camada do Supabase. O app trabalha com `ClinicData` em memória; aqui ficam a
 * conversão para as tabelas e a gravação apenas do que mudou entre dois estados.
 * Regras de acesso e validações finais ficam no banco (supabase/schema-saude.sql).
 */

const db = () => { if (!supabase) throw new Error('Supabase não configurado'); return supabase; };
const hhmm = (value?: string | null) => value ? value.slice(0, 5) : undefined;
const ageNumber = (value?: string) => { const n = parseInt(value ?? '', 10); return Number.isFinite(n) && n >= 0 && n <= 120 ? n : null; };
const ageText = (value: number | null) => value === null || value === undefined ? '' : String(value);

/* ------------------------------------------------------------------ */
/* Conversões linha ↔ app                                              */
/* ------------------------------------------------------------------ */

interface Settings { account?: Partial<AccountSettings>; team?: TeamMember[]; welcomeSeen?: boolean; viewAs?: string; }

type Row = Record<string, unknown>;

function professionalRow(data: ClinicData, ownerId: string): Row {
  const p = data.professional;
  const settings: Settings = {
    account: { notifyNewRequest: data.account.notifyNewRequest, notifyDailyAgenda: data.account.notifyDailyAgenda, remindPatients: data.account.remindPatients, reminderHours: data.account.reminderHours, twoFactor: data.account.twoFactor, pixKey: data.account.pixKey, pixHolder: data.account.pixHolder, signalAmount: data.account.signalAmount },
    team: data.team, welcomeSeen: data.welcomeSeen, viewAs: data.viewAs,
  };
  return {
    id: ownerId, slug: p.slug, name: p.name, email: data.account.email || null, phone: data.account.phone || null,
    profession: p.profession, council_number: p.councilNumber || null, specialties: p.specialties, categories: p.categories,
    modality: p.modality, city: p.city || null, headline: p.headline || null, bio: p.bio || null,
    photo_url: p.photo || null, cover_url: p.cover || null, services: p.services,
    booking_title: p.bookingTitle || 'O que você procura?', booking_intro: p.bookingIntro || '',
    availability: p.availability, settings,
  };
}

function fromProfessionalRow(row: Row): { professional: Professional; account: AccountSettings; team: TeamMember[]; welcomeSeen?: boolean; viewAs?: string } {
  const settings = (row.settings ?? {}) as Settings;
  return {
    professional: {
      slug: row.slug as string, name: row.name as string, profession: row.profession as Professional['profession'],
      councilNumber: (row.council_number as string) ?? undefined, specialties: (row.specialties as string[]) ?? [], categories: (row.categories as string[]) ?? [],
      modality: row.modality as Professional['modality'], city: (row.city as string) ?? undefined, headline: (row.headline as string) ?? undefined, bio: (row.bio as string) ?? undefined,
      photo: (row.photo_url as string) ?? undefined, cover: (row.cover_url as string) ?? undefined, services: (row.services as Professional['services']) ?? [],
      bookingTitle: (row.booking_title as string) ?? 'O que você procura?', bookingIntro: (row.booking_intro as string) ?? '',
      availability: row.availability as Professional['availability'],
    },
    account: {
      email: (row.email as string) ?? '', phone: (row.phone as string) ?? '',
      notifyNewRequest: settings.account?.notifyNewRequest ?? true, notifyDailyAgenda: settings.account?.notifyDailyAgenda ?? true,
      remindPatients: settings.account?.remindPatients ?? false, reminderHours: settings.account?.reminderHours ?? 24, twoFactor: false,
      pixKey: settings.account?.pixKey ?? '', pixHolder: settings.account?.pixHolder ?? '', signalAmount: settings.account?.signalAmount ?? '',
    },
    team: settings.team ?? [], welcomeSeen: settings.welcomeSeen, viewAs: settings.viewAs,
  };
}

const requestRow = (r: TriageRequest, ownerId: string): Row => ({
  id: r.id, professional_id: ownerId, name: r.name, age: ageNumber(r.age), phone: r.phone, guardian_name: r.guardianName || null,
  category: r.category || 'Outro assunto', service: r.service ?? null, payment_reported_at: r.paymentReportedAt ?? null, paid_at: r.paidAt ?? null, proposed_date: r.proposedDate ?? null, proposed_time: r.proposedTime ?? null, concern: r.concern ?? '', expectation: r.expectation ?? '', modality: r.modality ?? null,
  requested_date: r.requestedDate, requested_time: r.requestedTime, scheduled_date: r.scheduledDate ?? null, scheduled_time: r.scheduledTime ?? null,
  status: r.status, decline_reason: r.declineReason ?? null, outcome_note: r.outcomeNote ?? null, patient_id: r.patientId ?? null,
});
const fromRequestRow = (row: Row): TriageRequest => ({
  id: row.id as string, trackToken: (row.track_token as string) ?? undefined, paymentReportedAt: (row.payment_reported_at as string) ?? undefined, proposedDate: (row.proposed_date as string) ?? undefined, proposedTime: hhmm(row.proposed_time as string), paidAt: (row.paid_at as string) ?? undefined, name: row.name as string, age: ageText(row.age as number | null), phone: row.phone as string, guardianName: (row.guardian_name as string) ?? undefined,
  category: row.category as string, service: (row.service as string) ?? undefined, concern: (row.concern as string) ?? '', expectation: (row.expectation as string) ?? '', modality: (row.modality as TriageRequest['modality']) ?? undefined,
  requestedDate: row.requested_date as string, requestedTime: hhmm(row.requested_time as string)!, scheduledDate: (row.scheduled_date as string) ?? undefined, scheduledTime: hhmm(row.scheduled_time as string),
  status: row.status as TriageRequest['status'], createdAt: row.created_at as string, declineReason: (row.decline_reason as string) ?? undefined,
  outcomeNote: (row.outcome_note as string) ?? undefined, patientId: (row.patient_id as string) ?? undefined,
});

const patientRow = (p: Patient, ownerId: string): Row => ({
  id: p.id, professional_id: ownerId, request_id: p.requestId ?? null, name: p.name, age: ageNumber(p.age), phone: p.phone, guardian_name: p.guardianName || null,
  category: p.category ?? '', concern: p.concern ?? '', expectation: p.expectation ?? '', status: p.status, recurrence: p.recurrence ?? null,
});
const fromPatientRow = (row: Row): Patient => ({
  id: row.id as string, requestId: (row.request_id as string) ?? undefined, name: row.name as string, age: ageText(row.age as number | null), phone: row.phone as string,
  guardianName: (row.guardian_name as string) ?? undefined, category: row.category as string, concern: row.concern as string, expectation: row.expectation as string,
  status: row.status as Patient['status'], recurrence: (row.recurrence as Patient['recurrence']) ?? undefined, createdAt: row.created_at as string,
});

const appointmentRow = (a: Appointment, ownerId: string): Row => ({
  id: a.id, professional_id: ownerId, kind: a.kind, date: a.date, time: a.time, minutes: a.minutes, status: a.status,
  request_id: a.requestId ?? null, patient_id: a.patientId ?? null, title: a.title ?? '',
});
const fromAppointmentRow = (row: Row): Appointment => ({
  id: row.id as string, kind: row.kind as Appointment['kind'], date: row.date as string, time: hhmm(row.time as string)!, minutes: row.minutes as number,
  status: row.status as Appointment['status'], requestId: (row.request_id as string) ?? undefined, patientId: (row.patient_id as string) ?? undefined, title: row.title as string,
});

const noteRow = (n: SessionNote, ownerId: string): Row => ({
  id: n.id, professional_id: ownerId, patient_id: n.patientId, appointment_id: n.appointmentId ?? null, number: n.number, date: n.date, notes: n.notes, evolution: n.evolution,
});
const fromNoteRow = (row: Row): SessionNote => ({
  id: row.id as string, patientId: row.patient_id as string, appointmentId: (row.appointment_id as string) ?? undefined, number: row.number as number,
  date: row.date as string, notes: row.notes as string, evolution: row.evolution as string, updatedAt: row.updated_at as string,
});

/* ------------------------------------------------------------------ */
/* Leitura                                                             */
/* ------------------------------------------------------------------ */

/** Primeiro endereço livre a partir do nome (anaclara, anaclara2, anaclara3…). */
async function freeSlug(base: string) {
  const root = (base || 'profissional').slice(0, 36).padEnd(3, '0');
  for (let i = 0; i < 30; i++) {
    const candidate = i === 0 ? root : `${root}${i + 1}`;
    const { data } = await db().rpc('slug_available', { p_slug: candidate });
    if (data === true) return candidate;
  }
  return `${root}${Date.now().toString().slice(-4)}`;
}

export async function isSlugAvailable(slug: string) {
  const { data, error } = await db().rpc('slug_available', { p_slug: slug });
  return !error && data === true;
}

/** Carrega a conta inteira. Na primeira vez cria o perfil a partir do cadastro. */
export async function fetchClinic(owner: ClinicOwner, blank: () => ClinicData): Promise<ClinicData> {
  const client = db();
  let { data: pro } = await client.from('professionals').select('*').eq('id', owner.id).maybeSingle();
  if (!pro) {
    const start = blank();
    start.professional.slug = await freeSlug(start.professional.slug);
    const { data: created, error } = await client.from('professionals').insert(professionalRow(start, owner.id)).select('*').single();
    if (error) throw error;
    pro = created;
  }
  const [requests, patients, appointments, notes, subscription] = await Promise.all([
    client.from('triage_requests').select('*').eq('professional_id', owner.id).order('created_at', { ascending: false }),
    client.from('patients').select('*').eq('professional_id', owner.id).order('created_at', { ascending: false }),
    client.from('appointments').select('*').eq('professional_id', owner.id).order('date'),
    client.from('session_notes').select('*').eq('professional_id', owner.id),
    client.from('subscriptions').select('plan_id').eq('user_id', owner.id).eq('status', 'active').order('updated_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  for (const result of [requests, patients, appointments, notes]) if (result.error) throw result.error;
  const base = fromProfessionalRow(pro as Row);
  return {
    professional: base.professional, account: base.account, team: base.team, teamAppointments: [], welcomeSeen: base.welcomeSeen, viewAs: base.viewAs,
    plan: toPlanId(subscription.data?.plan_id) ?? 'gratis',
    requests: (requests.data ?? []).map(fromRequestRow),
    patients: (patients.data ?? []).map(fromPatientRow),
    appointments: (appointments.data ?? []).map(fromAppointmentRow),
    notes: (notes.data ?? []).map(fromNoteRow),
  };
}

/* ------------------------------------------------------------------ */
/* Gravação do que mudou                                               */
/* ------------------------------------------------------------------ */

function diff<T extends { id: string }>(before: T[], after: T[], toRow: (item: T) => Row) {
  const old = new Map(before.map(item => [item.id, JSON.stringify(toRow(item))]));
  const next = new Set(after.map(item => item.id));
  const changed: Row[] = []; const added: Row[] = [];
  for (const item of after) {
    const row = toRow(item); const previous = old.get(item.id);
    if (previous === undefined) added.push(row); else if (previous !== JSON.stringify(row)) changed.push(row);
  }
  return { changed, added, removed: before.filter(item => !next.has(item.id)).map(item => item.id) };
}

/** Sobe foto/capa que ainda estão no navegador (data URL) e devolve o endereço público. */
async function uploadImage(ownerId: string, kind: 'photo' | 'cover', dataUrl: string) {
  const blob = await (await fetch(dataUrl)).blob();
  const path = `${ownerId}/${kind}-${Date.now()}.jpg`;
  const { error } = await db().storage.from('perfis').upload(path, blob, { contentType: 'image/jpeg', upsert: false });
  if (error) throw error;
  return db().storage.from('perfis').getPublicUrl(path).data.publicUrl;
}

async function run(promise: PromiseLike<{ error: unknown }>) { const { error } = await promise; if (error) throw error; }

/**
 * Grava a diferença entre dois estados. Ordem: exclusões e alterações antes das
 * inclusões (para não esbarrar na regra de horários sobrepostos), e tabelas na
 * ordem das referências (pedido → paciente → agenda → caderneta).
 * Devolve campos que o servidor reescreveu (ex.: endereço da foto).
 */
export async function persistDiff(before: ClinicData, after: ClinicData, ownerId: string): Promise<Partial<Professional>> {
  const client = db();
  const patched: Partial<Professional> = {};
  const draft = { ...after, professional: { ...after.professional } };
  if (draft.professional.photo?.startsWith('data:')) draft.professional.photo = patched.photo = await uploadImage(ownerId, 'photo', draft.professional.photo);
  if (draft.professional.cover?.startsWith('data:')) draft.professional.cover = patched.cover = await uploadImage(ownerId, 'cover', draft.professional.cover);
  // Foto ou capa trocada/removida: apaga o arquivo antigo para não acumular.
  const stale = (['photo', 'cover'] as const).map(k => before.professional[k]).filter((old, i) => old && old !== draft.professional[(['photo', 'cover'] as const)[i]]);
  const paths = stale.map(old => old!.split('/storage/v1/object/public/perfis/')[1]).filter((path): path is string => Boolean(path) && path.startsWith(`${ownerId}/`));

  const proBefore = JSON.stringify(professionalRow(before, ownerId));
  const proAfter = professionalRow(draft, ownerId);
  if (proBefore !== JSON.stringify(proAfter)) await run(client.from('professionals').update(proAfter).eq('id', ownerId));
  if (paths.length) await client.storage.from('perfis').remove(paths);

  const requests = diff(before.requests, after.requests, r => requestRow(r, ownerId));
  const patients = diff(before.patients, after.patients, p => patientRow(p, ownerId));
  const appointments = diff(before.appointments, after.appointments, a => appointmentRow(a, ownerId));
  const notes = diff(before.notes, after.notes, n => noteRow(n, ownerId));

  if (appointments.removed.length) await run(client.from('appointments').delete().in('id', appointments.removed));
  // Primeiro libera horários (cancelamentos e remarcações), depois ocupa os novos.
  const releasing = appointments.changed.filter(row => row.status === 'canceled');
  const otherChanges = appointments.changed.filter(row => row.status !== 'canceled');
  for (const [table, rows] of [['triage_requests', requests.added], ['triage_requests', requests.changed]] as const) if (rows.length) await run(client.from(table).upsert(rows));
  for (const rows of [patients.added, patients.changed]) if (rows.length) await run(client.from('patients').upsert(rows));
  for (const rows of [releasing, otherChanges, appointments.added]) if (rows.length) await run(client.from('appointments').upsert(rows));
  for (const rows of [notes.added, notes.changed]) if (rows.length) await run(client.from('session_notes').upsert(rows));
  return patched;
}

/** Mensagem compreensível para erros do banco. */
export function describeError(error: unknown): string {
  const e = error as { message?: string; code?: string } | undefined;
  const message = e?.message ?? '';
  if (message.includes('LIMITE_PLANO_GRATIS')) return 'Você chegou ao limite de 5 pacientes do plano Grátis. Para cadastrar novos pacientes, assine o plano Profissional.';
  if (e?.code === '23P01' || message.includes('appointments_no_overlap')) return 'Esse horário já está ocupado por outro atendimento.';
  if (e?.code === '23505' && message.includes('slug')) return 'Esse endereço já está em uso. Escolha outro.';
  if (e?.code === '23514') return 'Algum dado está fora do formato aceito (texto longo demais ou valor inválido).';
  if (/jwt|auth|session/i.test(message)) return 'Sua sessão expirou. Entre de novo para continuar.';
  if (/fetch|network/i.test(message)) return 'Sem conexão com o servidor. Verifique a internet.';
  return 'Não foi possível salvar agora. Tente de novo.';
}

/* ------------------------------------------------------------------ */
/* Página pública (visitante anônimo)                                  */
/* ------------------------------------------------------------------ */

/** Perfil público e horários ocupados. Nenhum dado de paciente é devolvido. */
export async function fetchPublic(slug: string): Promise<Pick<ClinicData, 'professional' | 'appointments' | 'requests'> | null> {
  const client = db();
  const { data: profile, error } = await client.rpc('get_public_profile', { p_slug: slug });
  if (error || !profile) return null;
  const p = profile as Row;
  const availability = p.availability as Professional['availability'];
  const from = iso(new Date());
  const { data: busy } = await client.rpc('get_busy_slots', { p_slug: slug, p_from: from, p_to: addDays(from, (availability.horizonDays ?? 30) + 1) });
  const professional: Professional = {
    slug: p.slug as string, name: p.name as string, profession: p.profession as Professional['profession'], councilNumber: (p.councilNumber as string) ?? undefined,
    specialties: (p.specialties as string[]) ?? [], categories: (p.categories as string[]) ?? [], modality: p.modality as Professional['modality'], city: (p.city as string) ?? undefined,
    headline: (p.headline as string) ?? undefined, bio: (p.bio as string) ?? undefined, photo: (p.photo as string) ?? undefined, cover: (p.cover as string) ?? undefined,
    services: (p.services as Professional['services']) ?? [], bookingTitle: (p.bookingTitle as string) ?? 'O que você procura?', bookingIntro: (p.bookingIntro as string) ?? '',
    availability: { ...availability, blocks: availability.blocks ?? [] },
  };
  const appointments: Appointment[] = ((busy ?? []) as Row[]).map((row, i) => ({ id: `busy-${i}`, kind: 'triage', date: row.date as string, time: hhmm(row.time as string)!, minutes: row.minutes as number, status: 'scheduled', title: '' }));
  return { professional, appointments, requests: [] };
}

const SUBMIT_ERRORS: Record<string, string> = {
  HORARIO_OCUPADO: 'Esse horário acabou de ser reservado. Escolha outro, por favor.',
  HORARIO_INDISPONIVEL: 'Esse horário não está mais disponível. Escolha outro, por favor.',
  MUITOS_PEDIDOS: 'Você já tem pedidos aguardando confirmação com este profissional. Aguarde o contato antes de pedir outro horário.',
  TELEFONE_INVALIDO: 'Confira o telefone: use DDD e número.',
  RESPONSAVEL_OBRIGATORIO: 'Para menores de 18 anos, informe o nome do responsável.',
  NOME_INVALIDO: 'Confira o seu nome.',
  PROFISSIONAL_NAO_ENCONTRADO: 'Não encontramos este profissional.',
};

/** Envia o pedido pelo servidor, que valida horário, bloqueios e limites. */
export async function submitPublicRequest(slug: string, input: NewRequest): Promise<Outcome<TriageRequest>> {
  const { data, error } = await db().rpc('submit_triage_request', {
    p_slug: slug, p_name: input.name, p_age: ageNumber(input.age), p_phone: input.phone, p_guardian_name: input.guardianName ?? null,
    p_category: input.category, p_service: input.service ?? null, p_concern: input.concern, p_expectation: input.expectation, p_modality: input.modality ?? null,
    p_date: input.requestedDate, p_time: input.requestedTime,
  });
  if (error) {
    const code = Object.keys(SUBMIT_ERRORS).find(key => error.message.includes(key));
    return { error: code ? SUBMIT_ERRORS[code] : 'Não foi possível enviar o pedido agora. Tente de novo em instantes.' };
  }
  const result = data as { id: string; trackToken: string };
  // Avisa a profissional por e-mail; se falhar, o pedido continua valendo e aparece no painel.
  void fetch('/api/notify/new-request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trackToken: result.trackToken }), keepalive: true }).catch(() => undefined);
  return { value: { ...input, id: result.id, trackToken: result.trackToken, status: 'pending', createdAt: new Date().toISOString() } };
}

/** Código do link de acompanhamento da solicitação (cria se não existir). */
export async function ensureTrackingToken(requestId: string): Promise<string | undefined> {
  if (!supabase) return undefined;
  const { data, error } = await supabase.rpc('ensure_tracking_token', { p_request_id: requestId });
  return error ? undefined : (data as string);
}

/** Dados que o paciente vê no link de acompanhamento. */
export interface TrackedRequest {
  status: RequestStatus; name: string; service?: string; category: string; paymentReportedAt?: string; proposedDate?: string; proposedTime?: string;
  requestedDate: string; requestedTime: string; scheduledDate?: string; scheduledTime?: string;
  professional: string; slug: string; pixKey?: string; pixHolder?: string; signalAmount?: string; contactPhone?: string;
}

export async function fetchByTrackingToken(token: string): Promise<TrackedRequest | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc('get_request_by_token', { p_token: token });
  return error || !data ? null : (data as TrackedRequest);
}

/** Paciente marcou "já paguei" pelo link. */
export async function reportPayment(token: string): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase.rpc('report_payment', { p_token: token });
  return !error && data === true;
}

const PROPOSAL_ERRORS: Record<string, string> = {
  HORARIO_OCUPADO: 'Esse horário acabou de ser ocupado. Escolha outro, por favor.',
  HORARIO_INDISPONIVEL: 'Esse horário não está mais disponível. Escolha outro, por favor.',
  SEM_PROPOSTA: 'Este pedido não tem mais um horário sugerido. Atualize a página.',
};

/** Paciente aceita o horário sugerido (sem data) ou escolhe outro dia (com data e hora). */
export async function respondProposal(token: string, date?: string, time?: string): Promise<{ error?: string; status?: string }> {
  if (!supabase) return { error: 'Sem conexão com o servidor.' };
  const { data, error } = await supabase.rpc('respond_proposal', { p_token: token, p_date: date ?? null, p_time: time ?? null });
  if (error) {
    const code = Object.keys(PROPOSAL_ERRORS).find(key => error.message.includes(key));
    return { error: code ? PROPOSAL_ERRORS[code] : 'Não foi possível confirmar agora. Tente de novo em instantes.' };
  }
  return { status: (data as { status: string }).status };
}

/** Registro de acesso à caderneta (criar e editar o banco registra sozinho). */
export type NoteAccessAction = 'view' | 'create' | 'edit' | 'export';
export interface NoteAccess { action: NoteAccessAction; at: string }

export async function logNoteAccess(patientId: string, action: 'view' | 'export') {
  if (!supabase) return;
  await supabase.rpc('log_note_access', { p_patient_id: patientId, p_action: action });
}

export async function fetchNoteAccess(patientId: string): Promise<NoteAccess[] | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from('note_access_log').select('action, at').eq('patient_id', patientId).order('at', { ascending: false }).limit(50);
  return error ? null : (data as NoteAccess[]);
}
