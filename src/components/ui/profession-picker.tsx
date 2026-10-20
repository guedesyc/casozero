'use client';
import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { PROFESSION_LIST, PROFESSIONS, ProfessionId } from '@/config/professions';

export interface ProfessionChoice { profession: ProfessionId; specialties: string[]; categories: string[]; }

/** Chips de múltipla escolha, com opção de acrescentar um item próprio. */
export function ChipSelect({ options, value, onChange, addLabel }: { options: string[]; value: string[]; onChange: (value: string[]) => void; addLabel: string }) {
  const [custom, setCustom] = useState('');
  const all = [...options, ...value.filter(v => !options.includes(v))];
  const toggle = (item: string) => onChange(value.includes(item) ? value.filter(v => v !== item) : [...value, item]);
  const add = () => { const item = custom.trim(); if (item && !value.includes(item)) onChange([...value, item]); setCustom(''); };
  return <div className="chips">
    {all.map(item => <button type="button" key={item} className={value.includes(item) ? 'chip on' : 'chip'} onClick={() => toggle(item)} aria-pressed={value.includes(item)}>{item}{value.includes(item) && !options.includes(item) && <X size={12} />}</button>)}
    <span className="chip-add"><input value={custom} onChange={e => setCustom(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} placeholder={addLabel} /><button type="button" onClick={add} aria-label="Adicionar"><Plus size={14} /></button></span>
  </div>;
}

/** Profissão → especialidade/abordagem → demandas atendidas. Usado no cadastro e no perfil. */
export function ProfessionPicker({ value, onChange }: { value: ProfessionChoice; onChange: (value: ProfessionChoice) => void }) {
  const profession = PROFESSIONS[value.profession];
  return <div className="profession-picker">
    <div className="field"><span>Sua profissão</span>
      <div className="profession-grid">{PROFESSION_LIST.map(p => <button type="button" key={p.id} className={p.id === value.profession ? 'on' : ''} onClick={() => p.id !== value.profession && onChange({ profession: p.id, specialties: [], categories: [] })}><strong>{p.label}</strong><small>{p.council ?? 'Sem conselho obrigatório'}</small></button>)}</div>
    </div>
    <div className="field"><span>{profession.specialtyLabel} <small>Como você trabalha. Pode marcar mais de uma.</small></span>
      <ChipSelect options={profession.specialties} value={value.specialties} onChange={specialties => onChange({ ...value, specialties })} addLabel="Outra…" />
    </div>
    <div className="field"><span>O que você atende <small>Aparece para o paciente escolher no seu link.</small></span>
      <ChipSelect options={profession.categories} value={value.categories} onChange={categories => onChange({ ...value, categories })} addLabel="Outra demanda…" />
    </div>
  </div>;
}
