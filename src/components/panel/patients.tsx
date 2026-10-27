'use client';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarPlus, Check, ChevronRight, FileDown, NotebookPen, Repeat, Search } from 'lucide-react';
import { formatDayMonth, formatLong, formatShort, formatStamp, today, WEEKDAYS } from '@/lib/dates';
import { PROFESSIONS } from '@/config/professions';
import { addExtraSession, changeRecurrence, ClinicData, ensureNote, saveNote, setAppointmentStatus, setPatientStatus, useClinic } from '@/services/clinic';
import { fetchNoteAccess, logNoteAccess, NoteAccess, NoteAccessAction } from '@/services/remote';
import { isPast } from '@/services/scheduling';
import { Frequency, Patient, PatientStatus, SessionNote } from '@/types';
import { APPOINTMENT_LABELS, Badge, Block, FormError, initials, PageTitle, PATIENT_LABELS } from './shell';
import { Dialog } from './requests';

type Update = ReturnType<typeof useClinic>['update'];
const recurrenceText = (p: Patient) => p.recurrence ? `${WEEKDAYS[p.recurrence.weekday]}, ${p.recurrence.time} · ${p.recurrence.frequency === 'weekly' ? 'semanal' : 'quinzenal'}` : 'Sem horário fixo';

export function PatientsList({ data }: { data: ClinicData }) {
  const [status, setStatus] = useState<PatientStatus>('active');
  const [query, setQuery] = useState('');
  const items = data.patients.filter(p => p.status === status && p.name.toLowerCase().includes(query.toLowerCase()));
  return <section className="page">
    <PageTitle eyebrow="Acompanhamentos" title="Pacientes" text="Quem passou pela triagem e segue em atendimento." />
    <div className="toolbar"><div className="tabs">{(Object.keys(PATIENT_LABELS) as PatientStatus[]).map(s => <button key={s} className={s === status ? 'active' : ''} onClick={() => setStatus(s)}>{PATIENT_LABELS[s]} <b>{data.patients.filter(p => p.status === s).length}</b></button>)}</div><label className="search"><Search size={15} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar por nome" /></label></div>
    <div className="list">{items.length ? items.map(p => {
      const notes = data.notes.filter(n => n.patientId === p.id && n.number > 0);
      const next = data.appointments.filter(a => a.patientId === p.id && a.kind === 'session' && a.status === 'scheduled' && a.date >= today()).sort((a, b) => a.date.localeCompare(b.date))[0];
      return <Link key={p.id} href={`/app/pacientes/detalhe/?id=${p.id}`} className="list-row">
        <span className="initials">{initials(p.name)}</span>
        <span className="list-main"><strong>{p.name}</strong><small>{p.category} · {recurrenceText(p)}</small></span>
        <span className="list-when">{notes.length} sessão(ões) registradas</span>
        <span className="list-when">{next ? <>Próxima: {formatDayMonth(next.date)}, {next.time}</> : '—'}</span>
        <ChevronRight size={16} />
      </Link>;
    }) : <p className="muted empty-list">Nenhum paciente nesta lista.</p>}</div>
  </section>;
}

export function PatientDetail({ id, sessionId, data, update }: { id?: string; sessionId?: string; data: ClinicData; update: Update }) {
  const patient = data.patients.find(p => p.id === id);
  const [tab, setTab] = useState<'caderneta' | 'evolucao' | 'agenda' | 'dados'>('caderneta');
  const [openNote, setOpenNote] = useState<string | undefined>(sessionId);
  const [dialog, setDialog] = useState<'none' | 'recurrence' | 'extra'>('none');
  const [statusError, setStatusError] = useState('');
  useEffect(() => { if (sessionId) { setOpenNote(sessionId); setTab('caderneta'); } }, [sessionId]);
  // Cada abertura da caderneta ou da evolução fica no registro de acesso.
  const logged = useRef('');
  useEffect(() => {
    const key = `${id}:${tab}`;
    if (!id || !data.patients.some(p => p.id === id) || (tab !== 'caderneta' && tab !== 'evolucao') || logged.current === key) return;
    logged.current = key;
    void logNoteAccess(id, 'view');
  }, [id, tab, data.patients]);
  const notes = useMemo(() => data.notes.filter(n => n.patientId === id).sort((a, b) => b.number - a.number), [data.notes, id]);
  const appointments = useMemo(() => data.appointments.filter(a => a.patientId === id).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)), [data.appointments, id]);
  if (!patient) return <section className="page empty"><h1>Paciente não encontrado</h1><Link href="/app/pacientes">Voltar</Link></section>;

  const noun = PROFESSIONS[data.professional.profession].sessionNoun;
  const done = appointments.filter(a => a.kind === 'session' && a.status === 'done').length;
  const missed = appointments.filter(a => a.status === 'missed').length;
  const next = appointments.find(a => a.kind === 'session' && a.status === 'scheduled' && !isPast(a.date, a.time));
  // Sessões que já aconteceram e ainda não têm página na caderneta.
  const awaiting = appointments.filter(a => a.kind === 'session' && (a.status === 'done' || a.status === 'scheduled') && isPast(a.date, a.time) && !data.notes.some(n => n.appointmentId === a.id));

  const createNote = (appointmentId: string) => { const note = update(d => ensureNote(d, appointmentId)); if (note) { setOpenNote(note.id); setTab('caderneta'); } };

  return <section className="page detail">
    <Link href="/app/pacientes" className="back">← Pacientes</Link>
    <PageTitle eyebrow={`${patient.category} · desde ${formatStamp(patient.createdAt)}`} title={patient.name} text={<>{patient.age} anos · {patient.phone}{patient.guardianName && ` · responsável: ${patient.guardianName}`}</>}>
      <select aria-label="Situação do paciente" value={patient.status} onChange={e => { const s = e.target.value as PatientStatus; if (s === 'active' || confirm(`Marcar como “${PATIENT_LABELS[s]}”? As sessões futuras serão retiradas da agenda.`)) setStatusError(update(d => setPatientStatus(d, patient.id, s)).error ?? ''); }}>{(Object.keys(PATIENT_LABELS) as PatientStatus[]).map(s => <option key={s} value={s}>{PATIENT_LABELS[s]}</option>)}</select>
    </PageTitle>
    <FormError message={statusError} />
    <div className="patient-summary">
      <div><span>Horário fixo</span><strong>{recurrenceText(patient)}</strong>{patient.status === 'active' && <button className="text-link" onClick={() => setDialog('recurrence')}><Repeat size={13} /> Alterar</button>}</div>
      <div><span>Próxima {noun}</span><strong>{next ? `${formatDayMonth(next.date)}, ${next.time}` : '—'}</strong>{patient.status === 'active' && <button className="text-link" onClick={() => setDialog('extra')}><CalendarPlus size={13} /> Marcar avulsa</button>}</div>
      <div><span>Realizadas</span><strong>{done}</strong></div>
      <div><span>Faltas</span><strong>{missed}</strong></div>
    </div>
    <div className="tabs">{([['caderneta', 'Caderneta'], ['evolucao', 'Evolução'], ['agenda', 'Sessões'], ['dados', 'Triagem e dados']] as const).map(([k, l]) => <button key={k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>

    {tab === 'caderneta' && <div className="notebook">
      {awaiting.length > 0 && <div className="notice-row"><NotebookPen size={16} /><span>{awaiting.length === 1 ? `A ${noun} de ${formatDayMonth(awaiting[0].date)} ainda não tem anotação.` : `${awaiting.length} ${noun}s já realizadas ainda não têm anotação.`}</span><button className="primary small" onClick={() => createNote(awaiting[0].id)}>Escrever {awaiting.length === 1 ? 'agora' : `a de ${formatDayMonth(awaiting[0].date)}`}</button></div>}
      {notes.length ? notes.map(note => <NotePage key={note.id} note={note} noun={noun} open={openNote === note.id} toggle={() => setOpenNote(openNote === note.id ? undefined : note.id)} update={update} />) : <p className="muted">A caderneta começa quando a primeira {noun} for realizada.</p>}
    </div>}

    {tab === 'evolucao' && <Evolution patient={patient} notes={notes} noun={noun} professional={data.professional.name} />}

    {tab === 'agenda' && <Block title={`${noun[0].toUpperCase()}${noun.slice(1)}s`}>
      {appointments.length ? appointments.slice().reverse().map(a => {
        const note = data.notes.find(n => n.appointmentId === a.id);
        const past = isPast(a.date, a.time);
        return <div className={`appt-row ${a.status}`} key={a.id}>
          <div className="appt-time"><strong>{formatDayMonth(a.date)}</strong><small>{a.time}</small></div>
          <span className="appt-who"><span><strong>{a.kind === 'triage' ? 'Triagem' : note ? `${noun[0].toUpperCase()}${noun.slice(1)} ${note.number}` : `${noun[0].toUpperCase()}${noun.slice(1)}`}</strong><small>{a.minutes} min</small></span></span>
          {a.status === 'scheduled' && past ? <Badge tone="warn">Registrar</Badge> : <Badge tone={a.status}>{APPOINTMENT_LABELS[a.status]}</Badge>}
          <div className="appt-actions">
            {a.kind === 'session' && note && <button className="secondary small" onClick={() => { setOpenNote(note.id); setTab('caderneta'); }}><NotebookPen size={14} /> Abrir</button>}
            {a.kind === 'session' && !note && past && a.status !== 'missed' && a.status !== 'canceled' && <button className="secondary small" onClick={() => createNote(a.id)}><NotebookPen size={14} /> Anotar</button>}
            {a.kind === 'session' && a.status === 'scheduled' && <select aria-label="Situação" value="" onChange={e => update(d => setAppointmentStatus(d, a.id, e.target.value as 'done' | 'missed' | 'canceled'))}><option value="" disabled>Marcar…</option>{past && <option value="done">Realizada</option>}{past && <option value="missed">Falta</option>}<option value="canceled">Cancelada</option></select>}
          </div>
        </div>;
      }) : <p className="muted">Nenhuma {noun} registrada.</p>}
    </Block>}

    {tab === 'dados' && <div className="two-cols">
      <Block title="O que procurou tratar"><p className="quote">{patient.concern}</p></Block>
      <Block title="O que imaginava do acompanhamento"><p className="quote">{patient.expectation || '—'}</p></Block>
      {patient.requestId && <Link className="text-link" href={`/app/solicitacoes/detalhe/?id=${patient.requestId}`}>Ver solicitação original <ChevronRight size={14} /></Link>}
      <AccessHistory patientId={patient.id} />
    </div>}

    {dialog === 'recurrence' && <RecurrenceDialog patient={patient} update={update} close={() => setDialog('none')} />}
    {dialog === 'extra' && <ExtraDialog patient={patient} update={update} close={() => setDialog('none')} />}
  </section>;
}

/** Uma página da caderneta, com salvamento explícito e aviso de alterações pendentes. */
function NotePage({ note, noun, open, toggle, update }: { note: SessionNote; noun: string; open: boolean; toggle: () => void; update: Update }) {
  const [notes, setNotes] = useState(note.notes);
  const [evolution, setEvolution] = useState(note.evolution);
  const [saved, setSaved] = useState(false);
  useEffect(() => { setNotes(note.notes); setEvolution(note.evolution); }, [note.notes, note.evolution]);
  const dirty = notes !== note.notes || evolution !== note.evolution;
  const title = note.number === 0 ? 'Triagem' : `${noun[0].toUpperCase()}${noun.slice(1)} ${note.number}`;
  const save = () => { update(d => saveNote(d, note.id, { notes, evolution })); setSaved(true); setTimeout(() => setSaved(false), 1800); };
  return <article className={`note-page ${open ? 'open' : ''}`}>
    <button className="note-head" onClick={toggle} aria-expanded={open}>
      <span className="note-number">{note.number === 0 ? 'T' : note.number}</span>
      <span><strong>{title}</strong><small>{formatLong(note.date)}</small></span>
      <span className="note-preview">{note.evolution || note.notes || <i>Sem anotações</i>}</span>
      <ChevronRight size={16} />
    </button>
    {open && <div className="note-body">
      <label className="field"><span>Anotações da {note.number === 0 ? 'triagem' : noun}</span><textarea rows={8} value={notes} onChange={e => setNotes(e.target.value)} placeholder="O que foi trazido, intervenções, observações…" autoFocus={!note.notes} /></label>
      <label className="field"><span>Registro de evolução <small>Uma ou duas frases. Forma a linha do tempo do paciente.</small></span><input value={evolution} onChange={e => setEvolution(e.target.value)} placeholder="Ex.: primeiro movimento de colocar limites no trabalho." /></label>
      <div className="note-actions"><button className="primary small" disabled={!dirty} onClick={save}>{saved ? <><Check size={14} /> Salvo</> : 'Salvar'}</button>{dirty && <span className="muted">Alterações não salvas</span>}</div>
    </div>}
  </article>;
}

/** Linha do tempo com tudo que foi escrito nas sessões, da primeira à mais recente. */
function Evolution({ patient, notes, noun, professional }: { patient: Patient; notes: SessionNote[]; noun: string; professional: string }) {
  const [query, setQuery] = useState('');
  const [full, setFull] = useState(false);
  const ordered = notes.slice().sort((a, b) => a.number - b.number).filter(n => !query || `${n.notes} ${n.evolution}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="evolution">
    <div className="toolbar no-print"><label className="search"><Search size={15} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar nas anotações" /></label><label className="inline-check"><input type="checkbox" checked={full} onChange={e => setFull(e.target.checked)} /> Mostrar anotações completas</label><button className="primary small" onClick={() => { void logNoteAccess(patient.id, 'export'); window.print(); }} title="Abre a impressão; escolha “Salvar como PDF” no destino"><FileDown size={14} /> Baixar PDF</button></div>
    <header className="print-only"><h2>Evolução — {patient.name}</h2><p>{professional} · emitido em {formatShort(today())}</p></header>
    {ordered.length ? <ol className="evo-timeline">{ordered.map(n => <li key={n.id}>
      <span className="timeline-dot">{n.number === 0 ? 'T' : n.number}</span>
      <div><small>{n.number === 0 ? 'Triagem' : `${noun[0].toUpperCase()}${noun.slice(1)} ${n.number}`} · {formatShort(n.date)}</small>
        <strong>{n.evolution || <i className="muted">Sem registro de evolução</i>}</strong>
        {full && n.notes && <p>{n.notes}</p>}</div>
    </li>)}</ol> : <p className="muted">Nada encontrado.</p>}
  </div>;
}

const ACCESS_LABELS: Record<NoteAccessAction, string> = { view: 'Caderneta aberta', create: 'Anotação criada', edit: 'Anotação editada', export: 'PDF da evolução baixado' };

/** Quem mexeu na caderneta e quando (guarda do prontuário). */
function AccessHistory({ patientId }: { patientId: string }) {
  const [items, setItems] = useState<NoteAccess[] | null | undefined>();
  useEffect(() => { let alive = true; fetchNoteAccess(patientId).then(r => { if (alive) setItems(r); }); return () => { alive = false; }; }, [patientId]);
  if (items === null) return null;
  return <Block title="Acessos à caderneta">
    {items === undefined ? <p className="muted">Carregando…</p> : items.length ? <ul className="access-log">{items.map((item, i) => <li key={i}><span>{ACCESS_LABELS[item.action]}</span><small>{new Date(item.at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</small></li>)}</ul> : <p className="muted">Nenhum acesso registrado ainda.</p>}
    <p className="muted small-print">Mostra os 50 mais recentes. Os registros não podem ser editados nem apagados.</p>
  </Block>;
}

function RecurrenceDialog({ patient, update, close }: { patient: Patient; update: Update; close: () => void }) {
  const r = patient.recurrence;
  const [weekday, setWeekday] = useState(r?.weekday ?? 1);
  const [time, setTime] = useState(r?.time ?? '09:00');
  const [frequency, setFrequency] = useState<Frequency>(r?.frequency ?? 'weekly');
  const [startDate, setStartDate] = useState(today());
  const [error, setError] = useState('');
  return <Dialog title="Alterar horário fixo" close={close}>
    <p className="muted">As sessões futuras ainda marcadas serão substituídas pelo novo horário. As já realizadas não mudam.</p>
    <div className="field-row"><label className="field"><span>Dia da semana</span><select value={weekday} onChange={e => setWeekday(Number(e.target.value))}>{WEEKDAYS.map((w, i) => <option key={w} value={i}>{w}</option>)}</select></label><label className="field"><span>Horário</span><input type="time" value={time} onChange={e => setTime(e.target.value)} /></label></div>
    <div className="field-row"><label className="field"><span>Frequência</span><select value={frequency} onChange={e => setFrequency(e.target.value as Frequency)}><option value="weekly">Semanal</option><option value="biweekly">Quinzenal</option></select></label><label className="field"><span>Valendo a partir de</span><input type="date" min={today()} value={startDate} onChange={e => setStartDate(e.target.value)} /></label></div>
    <button className="primary full" onClick={() => { const r = update(d => changeRecurrence(d, patient.id, { weekday, time, frequency, startDate })); if (r.error) setError(r.error); else close(); }}>Salvar novo horário</button>
    <FormError message={error} />
  </Dialog>;
}

function ExtraDialog({ patient, update, close }: { patient: Patient; update: Update; close: () => void }) {
  const [date, setDate] = useState(today());
  const [time, setTime] = useState(patient.recurrence?.time ?? '09:00');
  const [error, setError] = useState('');
  return <Dialog title="Marcar sessão avulsa" close={close}>
    <p className="muted">Para reposição ou uma sessão extra fora do horário fixo.</p>
    <div className="field-row"><label className="field"><span>Data</span><input type="date" value={date} onChange={e => setDate(e.target.value)} /></label><label className="field"><span>Horário</span><input type="time" value={time} onChange={e => setTime(e.target.value)} /></label></div>
    <button className="primary full" disabled={!date || !time} onClick={() => { const r = update(d => addExtraSession(d, patient.id, date, time)); if (r.error) setError(r.error); else close(); }}>Lançar na agenda</button>
    <FormError message={error} />
  </Dialog>;
}
