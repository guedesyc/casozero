'use client';
import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { ArrowRight, Mail, MailCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';

/** Pede ao Supabase o e-mail de redefinição; o link volta para /redefinir-senha. */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [notice, setNotice] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!supabase) { setNotice('Autenticação não configurada.'); return; }
    setState('sending'); setNotice('');
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/redefinir-senha` });
    // Mesmo resultado com ou sem conta, para não revelar quais e-mails estão cadastrados.
    if (error && /rate|limit|seconds/i.test(error.message)) { setNotice('Muitos pedidos seguidos. Aguarde um minuto e tente de novo.'); setState('idle'); return; }
    setState('sent');
  }

  return <main className="auth-page"><section className="auth-card">
    <Link href="/" className="auth-brand">CasoZero</Link>
    {state === 'sent' ? <>
      <div className="confirmed-check"><MailCheck size={28} /></div>
      <p className="eyebrow">Verifique seu e-mail</p>
      <h1>Link enviado.</h1>
      <p className="auth-lead">Se existir uma conta com <b>{email}</b>, você vai receber um e-mail com o link para criar uma nova senha. Ele vale por 1 hora. Confira também a caixa de spam.</p>
      <button className="secondary full" onClick={() => setState('idle')}>Usar outro e-mail</button>
    </> : <>
      <p className="eyebrow">Recuperar acesso</p>
      <h1>Esqueceu a senha?</h1>
      <p className="auth-lead">Informe o e-mail da sua conta. Enviaremos um link para você criar uma senha nova.</p>
      <form onSubmit={submit}>
        <label className="field"><span>E-mail</span><div className="auth-input"><Mail size={16} /><input type="email" required autoFocus value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@email.com" /></div></label>
        <button className="primary full" disabled={state === 'sending'}>{state === 'sending' ? 'Enviando…' : 'Enviar link'} {state !== 'sending' && <ArrowRight size={16} />}</button>
      </form>
    </>}
    {notice && <p className="auth-notice">{notice}</p>}
    <Link href="/login" className="auth-back">Voltar para o login</Link>
  </section></main>;
}
