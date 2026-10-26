'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AlertCircle, ArrowLeft, ArrowRight, CalendarCheck, Check } from 'lucide-react';
import { formatLong } from '@/lib/dates';
import { PROFESSIONS } from '@/config/professions';
import { ClinicData, slugifyTopic, submitRequest, useClinic } from '@/services/clinic';
import { availableDates, freeSlots } from '@/services/scheduling';
import { Slot, SlotPicker } from '@/components/ui/slot-picker';
import { TriageRequest } from '@/types';
import { ProHeader } from './profile';

type Stage = 'need' | 'about' | 'slot' | 'review' | 'done';
const STEPS: [Stage, string][] = [['need', 'O que procura'], ['about', 'Seus dados'], ['slot', 'Triagem'], ['review', 'Confirmar']];
type Update = ReturnType<typeof useClinic>['update'];

/**
 * Pedido de triagem: demanda → dados → horário → envio. As etapas são livres
 * para avançar e voltar; só o envio exige nome, telefone, horário e consentimento.
 */
export default function Booking({ data, update, topic }: { data: ClinicData; update: Update; topic?: string }) {
  const professional = data.professional;
  const [stage, setStage] = useState<Stage>('need');
  const [need, setNeed] = useState({ category: professional.categories.find(c => slugifyTopic(c) === topic) ?? '', concern: '', expectation: '', modality: '' as '' | 'online' | 'presencial' });
  const [about, setAbout] = useState({ name: '', age: '', phone: '', guardianName: '' });
  const [slot, setSlot] = useState<Slot>();
  const [consent, setConsent] = useState(false);
  const [sent, setSent] = useState<TriageRequest>();
  const [error, setError] = useState('');
  const dates = useMemo(() => availableDates(professional, data.appointments, data.requests), [professional, data.appointments, data.requests]);

  const minor = Number(about.age) > 0 && Number(about.age) < 18;
  const missing: [Stage, string][] = [
    ...(!about.name.trim() ? [['about', 'seu nome'] as [Stage, string]] : []),
    ...(about.phone.replace(/\D/g, '').length < 10 ? [['about', 'um telefone com DDD'] as [Stage, string]] : []),
    ...(minor && !about.guardianName.trim() ? [['about', 'o nome do responsável'] as [Stage, string]] : []),
    ...(!slot ? [['slot', 'o horário da triagem'] as [Stage, string]] : []),
  ];
  const first = professional.name.split(' ')[0];
  const examples = PROFESSIONS[professional.profession].examples;

  function send() {
    if (!slot || !consent || missing.length) return;
    const result = update(d => submitRequest(d, {
      name: about.name.trim(), age: about.age, phone: about.phone, guardianName: minor ? about.guardianName.trim() : undefined,
      category: need.category || 'Outro assunto', concern: need.concern.trim(), expectation: need.expectation.trim(),
      modality: professional.modality === 'ambos' ? need.modality || undefined : professional.modality,
      requestedDate: slot.date, requestedTime: slot.time,
    }));
    if (result.error) { setError(result.error); setSlot(undefined); setStage('slot'); return; }
    setSent(result.value); setStage('done');
  }

  const go = (next: Stage) => { setError(''); setStage(next); window.scrollTo({ top: 0 }); };
  const current = STEPS.findIndex(s => s[0] === stage);

  return <main className="public-shell booking"><section className="public-card">
    <Link href={`/${professional.slug}`} className="back-link"><ArrowLeft size={14} /> Página de {first}</Link>
    <ProHeader professional={professional} compact />
    {stage !== 'done' && <ol className="stepper">{STEPS.map(([key, label], i) => <li key={key} className={key === stage ? 'current' : current > i ? 'past' : ''}><button type="button" onClick={() => go(key)}><b>{i + 1}</b>{label}</button></li>)}</ol>}
    {error && <p className="form-error"><AlertCircle size={15} /> {error}</p>}

    {stage === 'need' && <>
      <h1>{professional.bookingTitle || 'O que você procura?'}</h1>
      {professional.bookingIntro && <p className="lead">{professional.bookingIntro}</p>}
      <div className="field"><span>Escolha o assunto mais próximo</span><div className="chips">{professional.categories.map(c => <button type="button" key={c} className={need.category === c ? 'chip on' : 'chip'} onClick={() => setNeed({ ...need, category: need.category === c ? '' : c })}>{c}</button>)}</div></div>
      <label className="field"><span>Conte com suas palavras o que você gostaria de tratar</span><textarea rows={4} value={need.concern} onChange={e => setNeed({ ...need, concern: e.target.value })} placeholder={`Ex.: ${examples.concern}`} /></label>
      <label className="field"><span>O que você imagina ou espera desse acompanhamento? <small>Opcional</small></span><textarea rows={3} value={need.expectation} onChange={e => setNeed({ ...need, expectation: e.target.value })} placeholder={`Ex.: ${examples.expectation}`} /></label>
      {professional.modality === 'ambos' && <div className="field"><span>Como prefere ser atendido(a)?</span><div className="segmented">{(['online', 'presencial'] as const).map(m => <button type="button" key={m} className={need.modality === m ? 'active' : ''} onClick={() => setNeed({ ...need, modality: need.modality === m ? '' : m })}>{m === 'online' ? 'Online' : 'Presencial'}</button>)}</div></div>}
      <div className="button-row end"><button className="primary" onClick={() => go('about')}>Continuar <ArrowRight size={18} /></button></div>
    </>}

    {stage === 'about' && <>
      <h1>Agora, sobre você.</h1>
      <p className="lead">Usamos só para {first} entrar em contato e confirmar a triagem.</p>
      <label className="field"><span>Nome completo</span><input autoFocus value={about.name} onChange={e => setAbout({ ...about, name: e.target.value })} placeholder="Como podemos te chamar?" /></label>
      <div className="field-row">
        <label className="field"><span>Idade</span><input type="number" min={1} max={120} value={about.age} onChange={e => setAbout({ ...about, age: e.target.value })} /></label>
        <label className="field"><span>Telefone (WhatsApp)</span><input type="tel" value={about.phone} onChange={e => setAbout({ ...about, phone: e.target.value })} placeholder="(00) 00000-0000" /></label>
      </div>
      {minor && <label className="field"><span>Nome do responsável <small>Para menores de 18 anos</small></span><input value={about.guardianName} onChange={e => setAbout({ ...about, guardianName: e.target.value })} /></label>}
      <div className="button-row"><button className="secondary" onClick={() => go('need')}><ArrowLeft size={16} /> Voltar</button><button className="primary" onClick={() => go('slot')}>Escolher horário <ArrowRight size={18} /></button></div>
    </>}

    {stage === 'slot' && <>
      <h1>Quando pode ser a triagem?</h1>
      <p className="lead">A triagem é uma primeira conversa de {professional.availability.triageMinutes} minutos. Os dias destacados têm horário livre.</p>
      <SlotPicker available={dates} slotsFor={date => freeSlots(professional, data.appointments, data.requests, date)} value={slot} onChange={setSlot} />
      <div className="button-row"><button className="secondary" onClick={() => go('about')}><ArrowLeft size={16} /> Voltar</button><button className="primary" onClick={() => go('review')}>Revisar <ArrowRight size={18} /></button></div>
    </>}

    {stage === 'review' && <>
      <h1>Confira antes de enviar.</h1>
      <dl className="review-list">
        <Row label="Assunto" value={need.category || 'Não escolhido'} edit={() => go('need')} />
        <Row label="O que deseja tratar" value={need.concern || 'Não informado'} edit={() => go('need')} />
        {need.expectation && <Row label="O que espera" value={need.expectation} edit={() => go('need')} />}
        <Row label="Nome" value={about.name ? `${about.name}${about.age ? ` · ${about.age} anos` : ''}${minor && about.guardianName ? ` · responsável: ${about.guardianName}` : ''}` : '—'} edit={() => go('about')} />
        <Row label="Telefone" value={about.phone || '—'} edit={() => go('about')} />
        <Row label="Triagem" value={slot ? `${formatLong(slot.date)}, às ${slot.time}${need.modality ? ` · ${need.modality}` : ''}` : '—'} edit={() => go('slot')} />
      </dl>
      {missing.length > 0 && <div className="form-error"><AlertCircle size={15} /><span>Para enviar, falta informar {missing.map(([step, label], i) => <span key={label}>{i > 0 && (i === missing.length - 1 ? ' e ' : ', ')}<button type="button" onClick={() => go(step)}>{label}</button></span>)}.</span></div>}
      <label className="consent"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /><span>Autorizo que {professional.name} receba estas informações, que incluem dados sobre a minha saúde, para avaliar e agendar meu atendimento.</span></label>
      <div className="button-row"><button className="secondary" onClick={() => go('slot')}><ArrowLeft size={16} /> Voltar</button><button className="primary" disabled={!consent || missing.length > 0} onClick={send}>Pedir triagem <ArrowRight size={18} /></button></div>
      <p className="fineprint">O horário fica reservado até {first} confirmar.</p>
    </>}

    {stage === 'done' && sent && <div className="completion">
      <div className="success"><CalendarCheck size={30} /></div>
      <p className="eyebrow">Pedido enviado</p>
      <h1>Tudo certo, {sent.name.split(' ')[0]}!</h1>
      <p className="lead">Seu pedido de triagem para <b>{formatLong(sent.requestedDate)}, às {sent.requestedTime}</b> foi enviado. {first} vai confirmar pelo telefone {sent.phone}.</p>
      <ul className="checks"><li><Check size={15} /> Não é preciso pagar nada agora.</li><li><Check size={15} /> Se o horário não puder ser mantido, você receberá outra sugestão.</li></ul>
      <Link className="secondary" href={`/${professional.slug}`}>Voltar para a página de {first}</Link>
    </div>}
  </section></main>;
}

function Row({ label, value, edit }: { label: string; value: string; edit: () => void }) {
  return <div><dt>{label}<button type="button" onClick={edit}>Alterar</button></dt><dd>{value}</dd></div>;
}
