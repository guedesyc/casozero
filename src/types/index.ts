import { ProfessionId } from '@/config/professions';

export type Modality = 'online' | 'presencial' | 'ambos';

/** Janela de atendimento de um dia da semana (0 = domingo). */
export interface WeeklyWindow { weekday: number; enabled: boolean; start: string; end: string; }

export interface Availability {
  windows: WeeklyWindow[];
  /** Duração da triagem em minutos (fatia os horários livres). */
  triageMinutes: number;
  /** Duração padrão das sessões de acompanhamento. */
  sessionMinutes: number;
  /** Antecedência mínima, em horas, para o paciente pedir uma triagem. */
  minNoticeHours: number;
  /** Quantos dias à frente o calendário público mostra. */
  horizonDays: number;
  /** Folgas e bloqueios: dia inteiro ou só um intervalo de horas. */
  blocks: TimeBlock[];
}

export interface TimeBlock { id: string; date: string; allDay: boolean; start: string; end: string; reason?: string; }

/** Serviço exibido na página pública do profissional. */
export interface Service { id: string; name: string; description?: string; minutes?: number; price?: string; }

export interface Professional {
  slug: string;
  name: string;
  profession: ProfessionId;
  councilNumber?: string;
  specialties: string[];
  categories: string[];
  modality: Modality;
  city?: string;
  /** Foto e capa como data URL (reduzidas no navegador antes de salvar). */
  photo?: string;
  cover?: string;
  /** Frase curta abaixo do nome na página pública. */
  headline?: string;
  /** Biografia longa da página pública. */
  bio?: string;
  services: Service[];
  /** Textos da primeira etapa do pedido de triagem. */
  bookingTitle: string;
  bookingIntro: string;
  availability: Availability;
}

/** Preferências da conta (fictícias até a integração com o Supabase). */
export interface AccountSettings {
  email: string;
  phone: string;
  notifyNewRequest: boolean;
  notifyDailyAgenda: boolean;
  remindPatients: boolean;
  reminderHours: number;
  twoFactor: boolean;
}

export type RequestStatus =
  | 'pending'      // paciente pediu, aguardando a profissional
  | 'confirmed'    // triagem marcada
  | 'declined'     // profissional recusou o pedido
  | 'continued'    // triagem feita, segue em acompanhamento
  | 'not_continued'; // triagem feita, não segue

/** Pedido de triagem feito pelo link público. */
export interface TriageRequest {
  id: string;
  name: string;
  age: string;
  phone: string;
  guardianName?: string;
  category: string;
  /** Serviço escolhido pelo paciente (nome do serviço cadastrado pela profissional). */
  service?: string;
  /** O que a pessoa procura tratar. */
  concern: string;
  /** O que ela imagina / espera do acompanhamento. */
  expectation: string;
  modality?: Exclude<Modality, 'ambos'>;
  requestedDate: string;
  requestedTime: string;
  /** Data e hora da triagem confirmada (pode ser diferente da pedida). */
  scheduledDate?: string;
  scheduledTime?: string;
  status: RequestStatus;
  createdAt: string;
  declineReason?: string;
  /** Resultado da triagem, quando não segue (motivo/encaminhamento). */
  outcomeNote?: string;
  patientId?: string;
}

export type Frequency = 'weekly' | 'biweekly';
export interface Recurrence { weekday: number; time: string; frequency: Frequency; startDate: string; }

export type PatientStatus = 'active' | 'paused' | 'discharged';

export interface Patient {
  id: string;
  requestId?: string;
  name: string;
  age: string;
  phone: string;
  guardianName?: string;
  category: string;
  concern: string;
  expectation: string;
  status: PatientStatus;
  recurrence?: Recurrence;
  createdAt: string;
}

export type AppointmentKind = 'triage' | 'session';
export type AppointmentStatus = 'scheduled' | 'done' | 'missed' | 'canceled';

export interface Appointment {
  id: string;
  kind: AppointmentKind;
  date: string;
  time: string;
  minutes: number;
  status: AppointmentStatus;
  requestId?: string;
  patientId?: string;
  /** Nome exibido na agenda (paciente ou solicitante). */
  title: string;
}

/** Registro da caderneta: uma página por sessão. */
export interface SessionNote {
  id: string;
  patientId: string;
  appointmentId?: string;
  /** 0 = triagem; 1, 2, 3… = sessões de acompanhamento. */
  number: number;
  date: string;
  notes: string;
  /** Resumo curto que alimenta a linha de evolução. */
  evolution: string;
  updatedAt: string;
}

export type TeamRole = 'professional' | 'secretary';

/** Pessoa da clínica (plano Clínica). A secretária vê só a agenda, nunca a caderneta. */
export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  profession?: ProfessionId;
  status: 'active' | 'invited';
}

/** Compromisso de outro profissional da clínica, exibido na agenda compartilhada. */
export interface TeamAppointment { id: string; memberId: string; date: string; time: string; minutes: number; title: string; kind: AppointmentKind; }
