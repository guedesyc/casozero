'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Check, MailCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';

/**
 * Logo após o cadastro: pede para confirmar o e-mail.
 * Pelo link do e-mail (?token_hash=…&type=signup): confirma a conta e entra.
 */
export default function ConfirmedPage() {
  const [phase, setPhase] = useState<'waiting' | 'checking' | 'confirmed' | 'invalid'>('waiting');
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenHash = params.get('token_hash');
    if (!tokenHash || !supabase) return;
    setPhase('checking');
    supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'email' }).then(({ error }) => {
      setPhase(error ? 'invalid' : 'confirmed');
      window.history.replaceState(null, '', '/cadastro/confirmado');
    });
  }, []);

  return <main className="auth-page"><section className="auth-card auth-confirmed">
    {phase === 'waiting' && <>
      <div className="confirmed-check"><MailCheck size={30} /></div>
      <p className="eyebrow">Quase lá</p>
      <h1>Confirme seu e-mail.</h1>
      <p className="auth-lead">Enviamos um link para o e-mail cadastrado. Clique nele para ativar sua conta. Confira também a caixa de spam.</p>
      <Link href="/login" className="secondary full">Já confirmei, quero entrar</Link>
    </>}
    {phase === 'checking' && <p className="auth-lead">Confirmando seu e-mail…</p>}
    {phase === 'confirmed' && <>
      <div className="confirmed-check"><Check size={30} /></div>
      <p className="eyebrow">E-mail confirmado</p>
      <h1>Conta ativada.</h1>
      <p className="auth-lead">Tudo pronto. Sua conta começa no plano Grátis, com todos os recursos liberados.</p>
      <Link href="/app" className="primary full">Entrar no painel</Link>
    </>}
    {phase === 'invalid' && <>
      <p className="eyebrow">Link inválido</p>
      <h1>Este link expirou ou já foi usado.</h1>
      <p className="auth-lead">Se você já confirmou, é só entrar. Se não, faça o cadastro de novo para receber outro link.</p>
      <Link href="/login" className="primary full">Ir para o login</Link>
      <Link href="/cadastro" className="auth-back">Fazer cadastro</Link>
    </>}
  </section></main>;
}
