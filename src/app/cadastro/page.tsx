'use client';
import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { ArrowLeft, ArrowRight, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PROFESSIONS } from '@/config/professions';
import { ProfessionChoice, ProfessionPicker } from '@/components/ui/profession-picker';
import { loadClinic, saveClinic, saveProfessional, slugify } from '@/services/clinic';
import { Modality } from '@/types';

export default function SignupPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [account, setAccount] = useState({ name: '', email: '', password: '', confirm: '' });
  const [choice, setChoice] = useState<ProfessionChoice>({ profession: 'psicologia', specialties: [], categories: [] });
  const [details, setDetails] = useState<{ councilNumber: string; modality: Modality; city: string }>({ councilNumber: '', modality: 'ambos', city: '' });
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const profession = PROFESSIONS[choice.profession];

  function next(e: FormEvent) {
    e.preventDefault();
    if (account.password !== account.confirm) { setNotice('As senhas não conferem.'); return; }
    setNotice(''); setStep(2);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!choice.categories.length) { setNotice('Escolha ao menos uma demanda que você atende.'); return; }
    setLoading(true); setNotice('');
    const profile = { name: account.name, slug: slugify(account.name), ...choice, councilNumber: details.councilNumber ? `${profession.council ?? ''} ${details.councilNumber}`.trim() : undefined, modality: details.modality, city: details.city || undefined };
    // O perfil local alimenta o protótipo; com Supabase ele também vai para os metadados do usuário.
    const data = loadClinic(); saveProfessional(data, profile); saveClinic(data);
    if (!supabase) { window.location.href = '/app'; return; }
    const { data: result, error } = await supabase.auth.signUp({ email: account.email, password: account.password, options: { data: { full_name: account.name, profession: choice.profession, specialties: choice.specialties, categories: choice.categories, council_number: profile.councilNumber, modality: details.modality, city: details.city } } });
    if (error) { setNotice(error.message); setLoading(false); return; }
    if (result.session) await supabase.auth.signOut();
    window.location.href = '/cadastro/confirmado';
  }

  return <main className="auth-page"><section className="auth-card auth-card-wide signup-card">
    <Link href="/" className="auth-brand">CasoZero</Link>
    <p className="eyebrow">Novo cadastro · etapa {step} de 2</p>
    {step === 1 ? <>
      <h1>Comece sua rotina.</h1>
      <p className="auth-lead">Crie seu acesso. Na próxima etapa você conta qual é a sua área.</p>
      <form onSubmit={next}>
        <label className="field"><span>Nome completo</span><div className="auth-input"><UserRound size={16} /><input required value={account.name} onChange={e => setAccount({ ...account, name: e.target.value })} placeholder="Como aparece para os pacientes" /></div></label>
        <label className="field"><span>E-mail</span><div className="auth-input"><Mail size={16} /><input type="email" required value={account.email} onChange={e => setAccount({ ...account, email: e.target.value })} placeholder="voce@email.com" /></div></label>
        <label className="field"><span>Senha</span><div className="auth-input"><LockKeyhole size={16} /><input type="password" minLength={8} required value={account.password} onChange={e => setAccount({ ...account, password: e.target.value })} placeholder="Mínimo de 8 caracteres" /></div></label>
        <label className="field"><span>Confirmar senha</span><div className="auth-input"><LockKeyhole size={16} /><input type="password" minLength={8} required value={account.confirm} onChange={e => setAccount({ ...account, confirm: e.target.value })} placeholder="Repita sua senha" /></div></label>
        <button className="primary full">Continuar <ArrowRight size={16} /></button>
      </form>
    </> : <>
      <h1>Qual é a sua área?</h1>
      <p className="auth-lead">Com isso o CasoZero monta seu link e mostra ao paciente só o que você atende.</p>
      <form onSubmit={submit}>
        <ProfessionPicker value={choice} onChange={setChoice} />
        <div className="field-row">
          {profession.council && <label className="field"><span>Registro no {profession.council} <small>Opcional</small></span><input value={details.councilNumber} onChange={e => setDetails({ ...details, councilNumber: e.target.value })} placeholder="00/00000" /></label>}
          <label className="field"><span>Atendimento</span><select value={details.modality} onChange={e => setDetails({ ...details, modality: e.target.value as Modality })}><option value="ambos">Online e presencial</option><option value="online">Somente online</option><option value="presencial">Somente presencial</option></select></label>
          <label className="field"><span>Cidade <small>Opcional</small></span><input value={details.city} onChange={e => setDetails({ ...details, city: e.target.value })} placeholder="Ex.: Salvador - BA" /></label>
        </div>
        <div className="button-row"><button type="button" className="secondary" onClick={() => setStep(1)}><ArrowLeft size={16} /> Voltar</button><button className="primary" disabled={loading}>{loading ? 'Criando cadastro…' : 'Criar cadastro'} {!loading && <ArrowRight size={16} />}</button></div>
      </form>
    </>}
    {notice && <p className="auth-notice">{notice}</p>}
    <p className="auth-switch">Já possui uma conta? <Link href="/login">Entrar</Link></p>
  </section></main>;
}
