'use client';
import { useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ArrowLeft, ArrowRight, CalendarCheck, Check, MapPin, Monitor } from 'lucide-react';
import { PROFESSIONS } from '@/config/professions';
import { formatLong } from '@/lib/dates';
import { slugify, submitRequest, useClinic } from '@/services/clinic';
import { availableDates, freeSlots } from '@/services/scheduling';
import { Slot, SlotPicker } from '@/components/ui/slot-picker';
import { TriageRequest } from '@/types';

type Stage = 'need' | 'about' | 'slot' | 'review' | 'done';
const STEPS: [Stage, string][] = [['need', 'O que procura'], ['about', 'Seus dados'], ['slot', 'Triagem'], ['review', 'Confirmar']];

/** Link público do profissional: demanda → dados → horário da triagem → envio. */
export default function Booking() {
  const pathname = usePathname();
  const { data, update } = useClinic();
  const [slugPart, categoryPart] = pathname.split('/').filter(Boolean).filter(p => p !== 'casozero');
  const [stage, setStage] = useState<Stage>('need');
  const [need, setNeed] = useState({ category: '', concern: '', expectation: '', modality: '' as '' | 'online' | 'presencial' });
  const [about, setAbout] = useState({ name: '', age: '', phone: '', guardianName: '' });
  const [slot, setSlot] = useState<Slot>();
  const [consent, setConsent] = useState(false);
  const [sent, setSent] = useState<TriageRequest>();

  const professional = data?.professional;
  const dates = useMemo(() => data ? availableDates(data.professional, data.appointments, data.requests) : new Set<string>(), [data]);
  if (!data || !professional) return <main className="public-shell"><section className="public-card"><p>Carregando…</p></section></main>;
  if (slugPart !== professional.slug) return <main className="public-shell"><section className="public-card"><p className="eyebrow">Link não encontrado</p><h1>Não encontramos este profissional.</h1><p className="lead">Confira o endereço com quem te enviou o link.</p></section></main>;

  const profession = PROFESSIONS[professional.profession];
  const category = need.category || professional.categories.find(c => slugify(c) === categoryPart) || '';
  const minor = Number(about.age) > 0 && Number(about.age) < 18;
  const needOk = category && need.concern.trim().length >= 10 && (professional.modality !== 'ambos' || need.modality);
  const aboutOk = about.name.trim() && Number(about.age) > 0 && about.phone.replace(/\D/g, '').length >= 10 && (!minor || about.guardianName.trim());
  const first = about.name.split(' ')[0];

  function send() {
    if (!slot || !consent) return;
    const created = update(d => submitRequest(d, {
      name: about.name.trim(), age: about.age, phone: about.phone, guardianName: minor ? about.guardianName.trim() : undefined,
      category, concern: need.concern.trim(), expectation: need.expectation.trim(),
      modality: professional!.modality === 'ambos' ? need.modality || undefined : professional!.modality === 'online' ? 'online' : 'presencial',
      requestedDate: slot.date, requestedTime: slot.time,
    }));
    setSent(created); setStage('done');
  }

  const header = <header className="pro-header">
    <div className="pro-avatar">{professional.name.split(' ').map(x => x[0]).slice(0, 2).join('')}</div>
    <div><strong>{professional.name}</strong><span>{profession.title}{professional.specialties.length ? ` · ${professional.specialties.join(', ')}` : ''}</span>
      <small>{professional.councilNumber && <>{professional.councilNumber} · </>}{professional.modality === 'online' ? <><Monitor size={12} /> Online</> : professional.modality === 'presencial' ? <><MapPin size={12} /> Presencial{professional.city ? ` em ${professional.city}` : ''}</> : <><Monitor size={12} /> Online e presencial{professional.city ? ` · ${professional.city}` : ''}</>}</small></div>
  </header>;
  const stepper = stage !== 'done' && <ol className="stepper">{STEPS.map(([key, label], i) => <li key={key} className={key === stage ? 'current' : STEPS.findIndex(s => s[0] === stage) > i ? 'past' : ''}><b>{i + 1}</b>{label}</li>)}</ol>;

  return <main className="public-shell booking"><section className="public-card">
    {header}{stepper}
    {stage === 'need' && <>
      <h1>O que você procura?</h1>
      {professional.bio && <p className="lead">{professional.bio}</p>}
      <div className="field"><span>Escolha o assunto mais próximo</span><div className="chips">{professional.categories.map(c => <button type="button" key={c} className={category === c ? 'chip on' : 'chip'} onClick={() => setNeed({ ...need, category: c })}>{c}</button>)}</div></div>
      <label className="field"><span>Conte com suas palavras o que você gostaria de tratar</span><textarea rows={4} value={need.concern} onChange={e => setNeed({ ...need, concern: e.target.value })} placeholder="Não precisa de detalhes. O suficiente para a primeira conversa." /></label>
      <label className="field"><span>O que você imagina ou espera desse acompanhamento? <small>Opcional</small></span><textarea rows={3} value={need.expectation} onChange={e => setNeed({ ...need, expectation: e.target.value })} placeholder="Ex.: entender melhor o que sinto, voltar a correr sem dor…" /></label>
      {professional.modality === 'ambos' && <div className="field"><span>Como prefere ser atendido(a)?</span><div className="segmented">{(['online', 'presencial'] as const).map(m => <button type="button" key={m} className={need.modality === m ? 'active' : ''} onClick={() => setNeed({ ...need, modality: m })}>{m === 'online' ? 'Online' : 'Presencial'}</button>)}</div></div>}
      <button className="primary" disabled={!needOk} onClick={() => { setNeed({ ...need, category }); setStage('about'); }}>Continuar <ArrowRight size={18} /></button>
    </>}
    {stage === 'about' && <>
      <h1>Agora, sobre você.</h1>
      <p className="lead">Usamos só para {professional.name.split(' ')[0]} entrar em contato e confirmar a triagem.</p>
      <label className="field"><span>Nome completo</span><input autoFocus value={about.name} onChange={e => setAbout({ ...about, name: e.target.value })} placeholder="Como podemos te chamar?" /></label>
      <div className="field-row">
        <label className="field"><span>Idade</span><input type="number" min={1} max={120} value={about.age} onChange={e => setAbout({ ...about, age: e.target.value })} /></label>
        <label className="field"><span>Telefone (WhatsApp)</span><input type="tel" value={about.phone} onChange={e => setAbout({ ...about, phone: e.target.value })} placeholder="(00) 00000-0000" /></label>
      </div>
      {minor && <label className="field"><span>Nome do responsável <small>Obrigatório para menores de 18 anos</small></span><input value={about.guardianName} onChange={e => setAbout({ ...about, guardianName: e.target.value })} /></label>}
      <div className="button-row"><button className="secondary" onClick={() => setStage('need')}><ArrowLeft size={16} /> Voltar</button><button className="primary" disabled={!aboutOk} onClick={() => setStage('slot')}>Escolher horário <ArrowRight size={18} /></button></div>
    </>}
    {stage === 'slot' && <>
      <h1>Quando pode ser a triagem?</h1>
      <p className="lead">A triagem é uma primeira conversa de {professional.availability.triageMinutes} minutos. Os dias destacados têm horário livre.</p>
      <SlotPicker available={dates} slotsFor={date => freeSlots(professional, data.appointments, data.requests, date)} value={slot} onChange={setSlot} />
      <div className="button-row"><button className="secondary" onClick={() => setStage('about')}><ArrowLeft size={16} /> Voltar</button><button className="primary" disabled={!slot} onClick={() => setStage('review')}>Revisar <ArrowRight size={18} /></button></div>
    </>}
    {stage === 'review' && slot && <>
      <h1>Confira antes de enviar.</h1>
      <dl className="review-list">
        <div><dt>Assunto</dt><dd>{category}</dd></div>
        <div><dt>O que deseja tratar</dt><dd>{need.concern}</dd></div>
        {need.expectation && <div><dt>O que espera</dt><dd>{need.expectation}</dd></div>}
        <div><dt>Nome</dt><dd>{about.name} · {about.age} anos{minor && ` · responsável: ${about.guardianName}`}</dd></div>
        <div><dt>Telefone</dt><dd>{about.phone}</dd></div>
        <div><dt>Triagem</dt><dd>{formatLong(slot.date)}, às {slot.time}{need.modality && ` · ${need.modality}`}</dd></div>
      </dl>
      <label className="consent"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} /><span>Autorizo que {professional.name} receba estas informações, que incluem dados sobre a minha saúde, para avaliar e agendar meu atendimento.</span></label>
      <div className="button-row"><button className="secondary" onClick={() => setStage('slot')}><ArrowLeft size={16} /> Voltar</button><button className="primary" disabled={!consent} onClick={send}>Pedir triagem <ArrowRight size={18} /></button></div>
      <p className="fineprint">O horário fica reservado até {professional.name.split(' ')[0]} confirmar.</p>
    </>}
    {stage === 'done' && sent && <div className="completion">
      <div className="success"><CalendarCheck size={30} /></div>
      <p className="eyebrow">Pedido enviado</p>
      <h1>Tudo certo, {first}!</h1>
      <p className="lead">Seu pedido de triagem para <b>{formatLong(sent.requestedDate)}, às {sent.requestedTime}</b> foi enviado. {professional.name.split(' ')[0]} vai confirmar pelo telefone {sent.phone}.</p>
      <ul className="checks"><li><Check size={15} /> Não é preciso pagar nada agora.</li><li><Check size={15} /> Se o horário não puder ser mantido, você receberá outra sugestão.</li></ul>
    </div>}
  </section></main>;
}
