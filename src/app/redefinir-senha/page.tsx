'use client';
import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { ArrowRight, Check, LockKeyhole } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const MIN_LENGTH = 8;

/**
 * Chegada pelo link do e-mail de redefinição. O Supabase pode mandar o acesso
 * de três formas, conforme a configuração do projeto: tokens no fragmento da URL
 * (#access_token), código (?code=) ou token de recuperação (?token_hash=&type=recovery).
 */
export default function ResetPasswordPage() {
  const [phase, setPhase] = useState<'checking' | 'ready' | 'invalid' | 'saving' | 'done'>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!supabase) { setPhase('invalid'); return; }
    const client = supabase;
    const query = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.slice(1));
    if (query.get('error') || hash.get('error')) { setPhase('invalid'); return; }
    const { data: listener } = client.auth.onAuthStateChange(event => { if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') setPhase(p => p === 'checking' ? 'ready' : p); });
    (async () => {
      const code = query.get('code');
      const tokenHash = query.get('token_hash');
      if (code) await client.auth.exchangeCodeForSession(code).catch(() => undefined);
      else if (tokenHash) await client.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' }).catch(() => undefined);
      // Os tokens no fragmento são lidos sozinhos pelo cliente (detectSessionInUrl).
      const { data: { session } } = await client.auth.getSession();
      setPhase(p => p === 'checking' ? (session ? 'ready' : 'invalid') : p);
      if (code || tokenHash || window.location.hash) window.history.replaceState(null, '', '/redefinir-senha');
    })();
    return () => listener.subscription.unsubscribe();
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (password.length < MIN_LENGTH) { setNotice(`Use pelo menos ${MIN_LENGTH} caracteres.`); return; }
    if (password !== confirm) { setNotice('As senhas não conferem.'); return; }
    setNotice(''); setPhase('saving');
    const { error } = await supabase!.auth.updateUser({ password });
    if (error) { setNotice(/different|same/i.test(error.message) ? 'A nova senha precisa ser diferente da anterior.' : 'Não foi possível salvar. Peça um novo link e tente de novo.'); setPhase('ready'); return; }
    setPhase('done');
    setTimeout(() => { window.location.href = '/app'; }, 1500);
  }

  return <main className="auth-page"><section className="auth-card">
    <Link href="/" className="auth-brand">CasoZero</Link>
    {phase === 'checking' && <p className="auth-lead">Validando o link…</p>}
    {phase === 'invalid' && <>
      <p className="eyebrow">Link inválido</p>
      <h1>Este link expirou ou já foi usado.</h1>
      <p className="auth-lead">Os links de redefinição valem por pouco tempo e só funcionam uma vez. Peça um novo.</p>
      <Link href="/esqueci-senha" className="primary full">Pedir novo link</Link>
    </>}
    {(phase === 'ready' || phase === 'saving') && <>
      <p className="eyebrow">Segurança</p>
      <h1>Crie sua nova senha.</h1>
      <form onSubmit={submit}>
        <label className="field"><span>Nova senha</span><div className="auth-input"><LockKeyhole size={16} /><input type="password" autoComplete="new-password" minLength={MIN_LENGTH} required autoFocus value={password} onChange={e => setPassword(e.target.value)} placeholder={`Mínimo de ${MIN_LENGTH} caracteres`} /></div></label>
        <label className="field"><span>Confirmar senha</span><div className="auth-input"><LockKeyhole size={16} /><input type="password" autoComplete="new-password" minLength={MIN_LENGTH} required value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repita a senha" /></div></label>
        <button className="primary full" disabled={phase === 'saving'}>{phase === 'saving' ? 'Salvando…' : 'Salvar nova senha'} {phase !== 'saving' && <ArrowRight size={16} />}</button>
      </form>
    </>}
    {phase === 'done' && <>
      <div className="confirmed-check"><Check size={28} /></div>
      <h1>Senha alterada.</h1>
      <p className="auth-lead">Entrando no seu painel…</p>
    </>}
    {notice && <p className="auth-notice">{notice}</p>}
  </section></main>;
}
