import { addDays, today, weekdayOf } from '@/lib/dates';
import type { ClinicData } from '@/services/clinic';
import { AccountSettings, Appointment, Patient, Professional, SessionNote, TeamAppointment, TeamMember, TriageRequest } from '@/types';

/** Dados fictícios para a demonstração. As datas são relativas a hoje. */
export const DEMO_SLUG = 'anaclara';

export const demoProfessional: Professional = {
  slug: DEMO_SLUG,
  name: 'Ana Clara Moreira',
  profession: 'psicologia',
  councilNumber: 'CRP 00/00000',
  specialties: ['Psicanálise'],
  categories: ['Ansiedade', 'Família', 'Relacionamento / Casal', 'Luto', 'Autoestima', 'Trabalho e carreira'],
  modality: 'ambos',
  city: 'Salvador - BA',
  headline: 'Psicanálise para adultos. Um espaço para falar do que pesa, no seu tempo.',
  bio: 'Sou psicóloga clínica há 9 anos, com formação em psicanálise. Atendo adultos que chegam com ansiedade, questões familiares, conflitos nos relacionamentos e momentos de luto.\n\nNo consultório, o trabalho começa pela escuta: cada pessoa traz a sua história e o seu ritmo. Atendo presencialmente na Pituba e online para todo o Brasil.',
  services: [
    { id: 's1', name: 'Psicoterapia individual', description: 'Sessões semanais para adultos, online ou presenciais.', minutes: 50, price: 'R$ 180' },
    { id: 's2', name: 'Terapia de casal', description: 'Para casais que querem reconstruir o diálogo.', minutes: 80, price: 'R$ 260' },
    { id: 's3', name: 'Acompanhamento no luto', description: 'Apoio após a perda de alguém próximo.', minutes: 50, price: 'R$ 180' },
  ],
  bookingTitle: 'O que você procura?',
  bookingIntro: 'Atendo adultos em psicanálise, online e presencial. A triagem é uma conversa inicial de 30 minutos para entendermos juntos a sua demanda.',
  availability: {
    windows: [
      { weekday: 0, enabled: false, start: '08:00', end: '12:00' },
      { weekday: 1, enabled: true, start: '08:00', end: '18:00' },
      { weekday: 2, enabled: true, start: '13:00', end: '20:00' },
      { weekday: 3, enabled: true, start: '08:00', end: '18:00' },
      { weekday: 4, enabled: true, start: '13:00', end: '20:00' },
      { weekday: 5, enabled: true, start: '08:00', end: '14:00' },
      { weekday: 6, enabled: false, start: '08:00', end: '12:00' },
    ],
    triageMinutes: 30,
    sessionMinutes: 50,
    minNoticeHours: 12,
    horizonDays: 30,
    blocks: [],
  },
};

export const demoAccount: AccountSettings = {
  email: 'anaclara@exemplo.com',
  phone: '(71) 90000-0000',
  notifyNewRequest: true,
  notifyDailyAgenda: true,
  remindPatients: true,
  reminderHours: 24,
  twoFactor: false,
};

/** Equipe fictícia, usada quando o plano Clínica está ativo. */
export const demoTeam: TeamMember[] = [
  { id: 'm1', name: 'Paulo Reis', email: 'paulo@exemplo.com', role: 'professional', profession: 'fisioterapia', status: 'active' },
  { id: 'm2', name: 'Luísa Prado', email: 'luisa@exemplo.com', role: 'professional', profession: 'fonoaudiologia', status: 'active' },
  { id: 'm3', name: 'Carla Souza', email: 'carla@exemplo.com', role: 'secretary', status: 'active' },
];

/** Agenda fictícia dos colegas para as próximas semanas. */
export function buildTeamAppointments(): TeamAppointment[] {
  const plan: [string, number, string, string][] = [['m1', 1, '08:00', 'Jorge Lima'], ['m1', 2, '10:00', 'Sandra Melo'], ['m1', 4, '15:00', 'Otávio Nery'], ['m2', 3, '09:00', 'Bia (7 anos)'], ['m2', 5, '14:00', 'Heitor (5 anos)']];
  const out: TeamAppointment[] = [];
  for (let week = 0; week < 8; week++) for (const [memberId, weekday, time, title] of plan) {
    const date = addDays(nextWeekday(today(), weekday), 7 * week);
    out.push({ id: `t-${memberId}-${date}-${time}`, memberId, date, time, minutes: 50, title, kind: 'session' });
  }
  return out;
}

/** Próxima data (a partir de `from`, inclusive) que cai no dia da semana pedido. */
const nextWeekday = (from: string, weekday: number) => { let d = from; while (weekdayOf(d) !== weekday) d = addDays(d, 1); return d; };
const previousWeekday = (from: string, weekday: number) => { let d = addDays(from, -1); while (weekdayOf(d) !== weekday) d = addDays(d, -1); return d; };

const SAMPLE_NOTES: [string, string][] = [
  ['Chega falando da rotina de trabalho e da dificuldade de dormir. Associa a ansiedade às cobranças do chefe.', 'Relato centrado no trabalho; sono prejudicado.'],
  ['Traz lembranças da infância e a relação com o pai. Silêncios longos no fim da sessão.', 'Primeiras associações com a história familiar.'],
  ['Conta um sonho recorrente sobre perder o ônibus. Relaciona com o medo de “ficar para trás”.', 'Trabalho com sonho; tema do atraso e da comparação.'],
  ['Relata uma discussão com a irmã. Percebe que repete com ela o tom que critica na mãe.', 'Começa a reconhecer repetições na família.'],
  ['Sessão mais leve. Diz que conseguiu recusar uma demanda extra no trabalho pela primeira vez.', 'Primeiro movimento de colocar limites.'],
  ['Faltou energia no início; fala da exaustão. Retoma o tema do perfeccionismo.', 'Perfeccionismo como eixo.'],
];

function patientWithHistory(id: string, name: string, age: string, phone: string, category: string, concern: string, weekday: number, time: string, pastSessions: number, sessionMinutes: number) {
  const start = previousWeekday(today(), weekday);
  const firstSession = addDays(start, -7 * (pastSessions - 1));
  const triageDate = addDays(firstSession, -5);
  const requestId = `req-${id}`;
  const request: TriageRequest = { id: requestId, name, age, phone, category, concern, expectation: 'Entender melhor o que sinto e ter um espaço para falar.', requestedDate: triageDate, requestedTime: '14:00', scheduledDate: triageDate, scheduledTime: '14:00', status: 'continued', createdAt: `${addDays(triageDate, -3)}T10:00:00.000Z`, patientId: id };
  const patient: Patient = { id, requestId, name, age, phone, category, concern, expectation: request.expectation, status: 'active', recurrence: { weekday, time, frequency: 'weekly', startDate: firstSession }, createdAt: `${triageDate}T15:00:00.000Z` };
  const appointments: Appointment[] = [{ id: `tri-${id}`, kind: 'triage', date: triageDate, time: '14:00', minutes: 30, status: 'done', requestId, patientId: id, title: name }];
  const notes: SessionNote[] = [{ id: `note-${id}-0`, patientId: id, appointmentId: `tri-${id}`, number: 0, date: triageDate, notes: `Triagem. ${concern} Combinado acompanhamento semanal.`, evolution: 'Triagem realizada. Início do acompanhamento.', updatedAt: `${triageDate}T15:00:00.000Z` }];
  for (let i = 0; i < pastSessions; i++) {
    const date = addDays(firstSession, 7 * i);
    const appointmentId = `ses-${id}-${i + 1}`;
    appointments.push({ id: appointmentId, kind: 'session', date, time, minutes: sessionMinutes, status: 'done', patientId: id, title: name });
    const [text, evolution] = SAMPLE_NOTES[i % SAMPLE_NOTES.length];
    notes.push({ id: `note-${id}-${i + 1}`, patientId: id, appointmentId, number: i + 1, date, notes: text, evolution, updatedAt: `${date}T18:00:00.000Z` });
  }
  return { request, patient, appointments, notes };
}

export function buildSeed(): ClinicData {
  const professional = structuredClone(demoProfessional);
  const minutes = professional.availability.sessionMinutes;
  const d = today();
  const histories = [
    patientWithHistory('p1', 'Mariana Lopes', '34', '(71) 90000-0001', 'Ansiedade', 'Crises de ansiedade antes de reuniões e insônia.', 1, '09:00', 14, minutes),
    patientWithHistory('p2', 'Rafael Nunes', '41', '(71) 90000-0002', 'Luto', 'Perdeu o pai há quatro meses e não consegue retomar a rotina.', 3, '16:00', 6, minutes),
    patientWithHistory('p3', 'Juliana e Bruno', '29', '(71) 90000-0003', 'Relacionamento / Casal', 'Brigas frequentes e dificuldade de conversar sem discutir.', 4, '18:00', 3, minutes),
  ];
  const confirmedDate = nextWeekday(addDays(d, 2), 3);
  const pending: TriageRequest[] = [
    { id: 'req-n1', name: 'Camila Ferreira', age: '27', phone: '(71) 90000-0011', category: 'Autoestima', concern: 'Me comparo o tempo todo com outras pessoas e isso tem me travado no trabalho e nos relacionamentos.', expectation: 'Gostaria de me sentir mais segura e entender de onde vem essa insegurança.', modality: 'online', requestedDate: nextWeekday(addDays(d, 1), 1), requestedTime: '10:30', status: 'pending', createdAt: new Date().toISOString() },
    { id: 'req-n2', name: 'Pedro Henrique Sá', age: '16', phone: '(71) 90000-0012', guardianName: 'Lúcia Sá', category: 'Família', concern: 'Brigas constantes em casa depois da separação dos pais.', expectation: 'Ter alguém de fora para conversar.', modality: 'presencial', requestedDate: nextWeekday(addDays(d, 1), 2), requestedTime: '15:00', status: 'pending', createdAt: new Date(Date.now() - 86_400_000).toISOString() },
    { id: 'req-n3', name: 'Sônia Prado', age: '52', phone: '(71) 90000-0013', category: 'Trabalho e carreira', concern: 'Fui demitida depois de 20 anos na mesma empresa e me sinto perdida.', expectation: 'Organizar a cabeça para recomeçar.', modality: 'online', requestedDate: nextWeekday(addDays(d, 2), 5), requestedTime: '09:00', status: 'pending', createdAt: new Date(Date.now() - 2 * 86_400_000).toISOString() },
    { id: 'req-c1', name: 'Lucas Andrade', age: '38', phone: '(71) 90000-0014', category: 'Ansiedade', concern: 'Ansiedade forte à noite, coração acelerado.', expectation: 'Aprender a lidar com as crises.', modality: 'online', requestedDate: confirmedDate, requestedTime: '11:00', scheduledDate: confirmedDate, scheduledTime: '11:00', status: 'confirmed', createdAt: new Date(Date.now() - 3 * 86_400_000).toISOString() },
    { id: 'req-d1', name: 'Roberto Lima', age: '45', phone: '(71) 90000-0015', category: 'Ansiedade', concern: 'Quero um laudo para afastamento do trabalho.', expectation: 'Conseguir o laudo rapidamente.', modality: 'online', requestedDate: addDays(d, -4), requestedTime: '08:30', status: 'declined', declineReason: 'Pedido de laudo sem acompanhamento; orientado a procurar avaliação psiquiátrica.', createdAt: new Date(Date.now() - 6 * 86_400_000).toISOString() },
  ];
  return {
    professional,
    account: structuredClone(demoAccount),
    plan: 'gratis',
    team: structuredClone(demoTeam),
    teamAppointments: buildTeamAppointments(),
    requests: [...pending, ...histories.map(h => h.request)],
    patients: histories.map(h => h.patient),
    appointments: [
      { id: 'tri-c1', kind: 'triage', date: confirmedDate, time: '11:00', minutes: 30, status: 'scheduled', requestId: 'req-c1', title: 'Lucas Andrade' },
      ...histories.flatMap(h => h.appointments),
    ],
    notes: histories.flatMap(h => h.notes),
  };
}
