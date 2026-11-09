'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Check, ChevronDown, ChevronRight, ExternalLink, Sparkles, X } from 'lucide-react';
import type { ClinicData } from '@/services/clinic';
import { markOnboarding } from '@/services/clinic';

type Update = (change: (draft: ClinicData) => unknown) => unknown;

/**
 * Passo a passo de primeiro acesso. A ordem leva a profissional a preencher o
 * que o paciente vê e, no fim, a abrir a página para ver como ficou.
 * A conclusão vem dos dados da conta, não de marcação manual.
 */
export const ONBOARDING_STEPS = [
  {
    id: 'disponibilidade', title: 'Defina seus horários', href: '/app/disponibilidade', action: 'Abrir disponibilidade',
    text: 'Escolha os dias e horários em que você atende. Só esses horários aparecem para o paciente pedir triagem.',
    isDone: (d: ClinicData) => Boolean(d.onboarding?.availabilitySaved),
  },
  {
    id: 'perfil', title: 'Preencha seu perfil', href: '/app/perfil', action: 'Abrir perfil',
    text: 'Foto, profissão, abordagem e as demandas que você atende. É a primeira coisa que o paciente lê.',
    isDone: (d: ClinicData) => d.professional.categories.length > 0,
  },
  {
    id: 'pagina', title: 'Monte sua página pública', href: '/app/pagina', action: 'Abrir página pública',
    text: 'Frase de apresentação e serviços com o valor da triagem.',
    isDone: (d: ClinicData) => d.professional.services.length > 0 && Boolean(d.professional.headline),
  },
  {
    id: 'link', title: 'Veja como ficou e divulgue', href: '/app/meu-link', action: 'Abrir meu link',
    text: 'Abra sua página como um paciente veria e depois compartilhe o seu link.',
    isDone: (d: ClinicData) => Boolean(d.onboarding?.linkOpened),
  },
] as const;

/** Janela do primeiro acesso: aparece uma vez por conta. */
export function OnboardingIntro({ update, name }: { update: Update; name: string }) {
  const close = () => update(d => markOnboarding(d, 'seen'));
  return <div className="modal" role="dialog" aria-modal="true" aria-label="Primeiros passos">
    <div className="modal-card welcome-card">
      <div className="welcome-icon"><Sparkles size={22} /></div>
      <p className="eyebrow">Primeiros passos</p>
      <h2>Vamos deixar sua página pronta, {name.split(' ')[0]}?</h2>
      <p>Em 4 passos, seu paciente já consegue ver seus horários e pedir uma triagem. O quadro no início do painel mostra o que falta até terminar.</p>
      <ol className="onboard-list">
        {ONBOARDING_STEPS.map((step, i) => <li key={step.id}><span className="onboard-num">{i + 1}</span><span><strong>{step.title}</strong><small>{step.text}</small></span></li>)}
      </ol>
      <div className="welcome-actions">
        <Link className="primary" href={`${ONBOARDING_STEPS[0].href}#passo`} onClick={close}>Começar pelo passo 1</Link>
        <button className="secondary" onClick={close}>Fazer depois</button>
      </div>
    </div>
  </div>;
}

/**
 * Quadro com os passos, no início do painel. Enquanto houver passo pendente
 * ele não pode ser ocultado; só some depois de concluído e ocultado pela pessoa.
 */
export function OnboardingChecklist({ data, update, slug }: { data: ClinicData; update: Update; slug: string }) {
  // No celular o quadro começa recolhido, para não tomar a tela; no computador, aberto.
  const [open, setOpen] = useState(true);
  useEffect(() => { if (window.matchMedia('(max-width: 720px)').matches) setOpen(false); }, []);
  const statuses = ONBOARDING_STEPS.map(step => ({ step, done: step.isDone(data) }));
  const doneCount = statuses.filter(s => s.done).length;
  const complete = doneCount === ONBOARDING_STEPS.length;
  if (complete && data.onboarding?.hidden) return null;
  return <section className="onboard-card" aria-label="Primeiros passos">
    <div className="onboard-head">
      <div><p className="eyebrow">Primeiros passos · {doneCount} de {ONBOARDING_STEPS.length}</p><h2>{complete ? 'Tudo pronto! Divulgue seu link para os pacientes' : 'Deixe sua página pronta para receber pacientes'}</h2></div>
      <div className="onboard-tools">
        <button className="onboard-dismiss" onClick={() => setOpen(v => !v)} aria-expanded={open} aria-label={open ? 'Recolher passos' : 'Mostrar passos'} title={open ? 'Recolher' : 'Mostrar'}><ChevronDown size={16} className={open ? 'chev-up' : ''} /></button>
        {complete && <button className="onboard-dismiss" onClick={() => update(d => markOnboarding(d, 'hidden'))} aria-label="Ocultar primeiros passos" title="Ocultar"><X size={16} /></button>}
      </div>
    </div>
    <div className="onboard-progress" aria-hidden="true"><span style={{ width: `${(doneCount / ONBOARDING_STEPS.length) * 100}%` }} /></div>
    {open && <ol className="onboard-steps">
      {statuses.map(({ step, done }, i) => <li key={step.id} className={done ? 'done' : ''}>
        <span className="onboard-check" aria-label={done ? 'Feito' : 'Pendente'}>{done ? <Check size={14} /> : i + 1}</span>
        <div className="onboard-body">
          <strong>{step.title}</strong>
          <small>{step.text}</small>
          <div className="onboard-actions">
            <Link className="secondary small" href={`${step.href}#passo`}>{step.action} <ChevronRight size={14} /></Link>
            {step.id === 'link' && <a className="primary small" href={`/${slug}`} target="_blank" rel="noreferrer" onClick={() => update(d => markOnboarding(d, 'linkOpened'))}><ExternalLink size={14} /> Abrir minha página</a>}
          </div>
        </div>
      </li>)}
    </ol>}
  </section>;
}
