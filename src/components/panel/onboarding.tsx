'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Check, ChevronDown, ChevronRight, ExternalLink, Sparkles, X } from 'lucide-react';

/**
 * Passo a passo do primeiro acesso. A ordem leva a profissional a preencher o
 * que o paciente vê e, no fim, a abrir a página para ver como ficou.
 */
export const ONBOARDING_STEPS = [
  { id: 'disponibilidade', title: 'Defina seus horários', text: 'Escolha os dias e horários em que você atende. Só esses horários aparecem para o paciente pedir triagem.', href: '/app/disponibilidade', action: 'Abrir disponibilidade' },
  { id: 'perfil', title: 'Preencha seu perfil', text: 'Foto, profissão, abordagem e as demandas que você atende. É a primeira coisa que o paciente lê.', href: '/app/perfil', action: 'Abrir perfil' },
  { id: 'pagina', title: 'Monte sua página pública', text: 'Capa, frase de apresentação, biografia e serviços com o valor da triagem.', href: '/app/pagina', action: 'Abrir página pública' },
  { id: 'link', title: 'Veja como ficou e divulgue', text: 'Abra sua página como um paciente veria e depois compartilhe o seu link.', href: '/app/meu-link', action: 'Abrir meu link' },
] as const;

type StepId = typeof ONBOARDING_STEPS[number]['id'];
interface OnboardingState { seen: boolean; dismissed: boolean; done: StepId[]; }

const keyFor = (ownerId: string) => `casozero-onboarding:${ownerId}`;

function readState(ownerId: string): OnboardingState {
  try {
    const raw = window.localStorage.getItem(keyFor(ownerId));
    const parsed = raw ? JSON.parse(raw) : {};
    return { seen: Boolean(parsed.seen), dismissed: Boolean(parsed.dismissed), done: Array.isArray(parsed.done) ? parsed.done : [] };
  } catch { return { seen: false, dismissed: false, done: [] }; }
}

function writeState(ownerId: string, state: OnboardingState) {
  try { window.localStorage.setItem(keyFor(ownerId), JSON.stringify(state)); } catch { /* sem armazenamento: o guia só some na próxima visita */ }
}

/** Progresso do passo a passo, guardado neste navegador por conta. Null enquanto não carrega. */
export function useOnboarding(ownerId?: string) {
  const [state, setState] = useState<OnboardingState | null>(null);
  useEffect(() => { if (ownerId) setState(readState(ownerId)); }, [ownerId]);
  const update = (next: (s: OnboardingState) => OnboardingState) => {
    if (!ownerId) return;
    setState(prev => { const base = prev ?? readState(ownerId); const value = next(base); writeState(ownerId, value); return value; });
  };
  return {
    state,
    seen: () => update(s => ({ ...s, seen: true })),
    dismiss: () => update(s => ({ ...s, dismissed: true })),
    toggle: (id: StepId) => update(s => ({ ...s, done: s.done.includes(id) ? s.done.filter(x => x !== id) : [...s.done, id] })),
    markDone: (id: StepId) => update(s => s.done.includes(id) ? s : { ...s, done: [...s.done, id] }),
  };
}

type Onboarding = ReturnType<typeof useOnboarding>;

/** Janela do primeiro acesso: apresenta o passo a passo uma vez. */
export function OnboardingIntro({ onboarding, name }: { onboarding: Onboarding; name: string }) {
  const close = () => onboarding.seen();
  return <div className="modal" role="dialog" aria-modal="true" aria-label="Primeiros passos">
    <div className="modal-card welcome-card">
      <div className="welcome-icon"><Sparkles size={22} /></div>
      <p className="eyebrow">Primeiros passos</p>
      <h2>Vamos deixar sua página pronta, {name.split(' ')[0]}?</h2>
      <p>Em 4 passos, seu paciente já consegue ver seus horários e pedir uma triagem. Você pode fazer agora ou depois, pelo quadro no início do painel.</p>
      <ol className="onboard-list">
        {ONBOARDING_STEPS.map((step, i) => <li key={step.id}><span className="onboard-num">{i + 1}</span><span><strong>{step.title}</strong><small>{step.text}</small></span></li>)}
      </ol>
      <div className="welcome-actions">
        <Link className="primary" href={ONBOARDING_STEPS[0].href} onClick={close}>Começar pelo passo 1</Link>
        <button className="secondary" onClick={close}>Fazer depois</button>
      </div>
    </div>
  </div>;
}

/** Quadro com os passos, no início do painel, até a profissional concluir ou dispensar. */
export function OnboardingChecklist({ onboarding, slug }: { onboarding: Onboarding; slug: string }) {
  const { state } = onboarding;
  // No celular o quadro começa recolhido, para não tomar a tela; no computador, aberto.
  const [open, setOpen] = useState(true);
  useEffect(() => { if (window.matchMedia('(max-width: 720px)').matches) setOpen(false); }, []);
  if (!state || state.dismissed) return null;
  const doneCount = ONBOARDING_STEPS.filter(s => state.done.includes(s.id)).length;
  const complete = doneCount === ONBOARDING_STEPS.length;
  return <section className="onboard-card" aria-label="Primeiros passos">
    <div className="onboard-head">
      <div><p className="eyebrow">Primeiros passos · {doneCount} de {ONBOARDING_STEPS.length}</p><h2>{complete ? 'Tudo pronto! Divulgue seu link para os pacientes' : 'Deixe sua página pronta para receber pacientes'}</h2></div>
      <div className="onboard-tools">
        <button className="onboard-dismiss" onClick={() => setOpen(v => !v)} aria-expanded={open} aria-label={open ? 'Recolher passos' : 'Mostrar passos'} title={open ? 'Recolher' : 'Mostrar'}><ChevronDown size={16} className={open ? 'chev-up' : ''} /></button>
        <button className="onboard-dismiss" onClick={() => onboarding.dismiss()} aria-label="Ocultar primeiros passos" title="Ocultar"><X size={16} /></button>
      </div>
    </div>
    <div className="onboard-progress" aria-hidden="true"><span style={{ width: `${(doneCount / ONBOARDING_STEPS.length) * 100}%` }} /></div>
    {open && <ol className="onboard-steps">
      {ONBOARDING_STEPS.map((step, i) => {
        const done = state.done.includes(step.id);
        const isLink = step.id === 'link';
        return <li key={step.id} className={done ? 'done' : ''}>
          <button className="onboard-check" onClick={() => onboarding.toggle(step.id)} aria-pressed={done} aria-label={`Marcar "${step.title}" como ${done ? 'pendente' : 'feito'}`}>{done ? <Check size={14} /> : i + 1}</button>
          <div className="onboard-body">
            <strong>{step.title}</strong>
            <small>{step.text}</small>
            <div className="onboard-actions">
              <Link className="secondary small" href={`${step.href}#passo`} onClick={() => onboarding.markDone(step.id)}>{step.action} <ChevronRight size={14} /></Link>
              {isLink && <a className="primary small" href={`/${slug}`} target="_blank" rel="noreferrer" onClick={() => onboarding.markDone('link')}><ExternalLink size={14} /> Abrir minha página</a>}
            </div>
          </div>
        </li>;
      })}
    </ol>}
  </section>;
}
