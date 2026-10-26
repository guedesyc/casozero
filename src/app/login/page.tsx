'use client';
import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { ArrowRight, LockKeyhole, Mail } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ResendConfirmation } from '@/components/ui/email-confirm';

/** Mensagens do Supabase Auth em português. */
function loginError(message: string) {
  if (/invalid login credentials/i.test(message)) return 'E-mail ou senha incorretos.';
  if (/rate|seconds|too many/i.test(message)) return 'Muitas tentativas seguidas. Aguarde um minuto e tente de novo.';
  return 'Não foi possível entrar agora. Tente de novo em instantes.';
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [unconfirmed, setUnconfirmed] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true); setNotice(''); setUnconfirmed(false);
    const form = new FormData(event.currentTarget);
    if (!supabase) { window.location.href = '/app'; return; }
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: String(form.get('password')) });
    setLoading(false);
    if (error) {
      if (/email not confirmed/i.test(error.message)) { setUnconfirmed(true); return; }
      setNotice(loginError(error.message)); return;
    }
    window.location.href = '/app';
  }

  return <main className="auth-page"><section className="auth-card">
    <Link href="/" className="auth-brand">CasoZero</Link>
    <p className="eyebrow">Acesso ao sistema</p>
    <h1>Entre na sua conta.</h1>
    <p className="auth-lead">Sua agenda, seus pacientes e a caderneta de cada um.</p>
    <form onSubmit={submit}>
      <label className="field"><span>E-mail</span><div className="auth-input"><Mail size={16} /><input name="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@email.com" /></div></label>
      <label className="field"><span>Senha</span><div className="auth-input"><LockKeyhole size={16} /><input name="password" type="password" required placeholder="Sua senha" /></div></label>
      <Link href="/esqueci-senha" className="auth-forgot">Esqueci minha senha</Link>
      <button className="primary full" disabled={loading}>{loading ? 'Entrando...' : 'Entrar'} {!loading && <ArrowRight size={16} />}</button>
    </form>
    {unconfirmed && <div className="auth-notice confirm-pending">
      <p><b>Confirme seu e-mail para entrar.</b> Enviamos um link para {email}. Não encontrou? Confira a caixa de spam.</p>
      <ResendConfirmation email={email.trim()} />
    </div>}
    {notice && <p className="auth-notice">{notice}</p>}
    <p className="auth-switch">Ainda não tem uma conta? <Link href="/cadastro">Inscrever-se</Link></p>
    <Link href="/" className="auth-back">Voltar para apresentação</Link>
  </section></main>;
}
