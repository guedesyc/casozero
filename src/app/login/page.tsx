'use client';
import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { ArrowRight, LockKeyhole, Mail } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const [loading, setLoading] = useState(false); const [notice, setNotice] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setLoading(true); setNotice(''); const form = new FormData(event.currentTarget); if (!supabase) { setNotice('Autenticação não configurada.'); setLoading(false); return; } const { error } = await supabase.auth.signInWithPassword({ email: String(form.get('email')), password: String(form.get('password')) }); setLoading(false); if (error) { setNotice(error.message); return; } window.location.href = '/app'; }
  return <main className="auth-page"><section className="auth-card"><Link href="/" className="auth-brand">CasoZero</Link><p className="eyebrow">Acesso ao sistema</p><h1>Entre na sua conta.</h1><p className="auth-lead">Acompanhe seus atendimentos, casos e próximos passos.</p><form onSubmit={submit}><label className="field"><span>E-mail</span><div className="auth-input"><Mail size={16}/><input name="email" type="email" required placeholder="voce@empresa.com"/></div></label><label className="field"><span>Senha</span><div className="auth-input"><LockKeyhole size={16}/><input name="password" type="password" required placeholder="Sua senha"/></div></label><button className="primary full" disabled={loading}>{loading?'Entrando...':'Entrar'} {!loading&&<ArrowRight size={16}/>}</button></form>{notice&&<p className="auth-notice">{notice}</p>}<p className="auth-switch">Ainda não tem uma conta? <Link href="/cadastro">Inscrever-se</Link></p><Link href="/" className="auth-back">Voltar para apresentação</Link></section></main>;
}
