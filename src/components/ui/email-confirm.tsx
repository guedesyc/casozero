'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { MailCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const COOLDOWN = 60;

/** Reenvia o e-mail de confirmação do cadastro, com espera entre um envio e outro. */
export function ResendConfirmation({ email, startCooling = false }: { email: string; startCooling?: boolean }) {
  const [wait, setWait] = useState(startCooling ? COOLDOWN : 0);
  const [status, setStatus] = useState('');
  useEffect(() => { if (wait <= 0) return; const t = setTimeout(() => setWait(w => w - 1), 1000); return () => clearTimeout(t); }, [wait]);
  async function resend() {
    if (!supabase || wait > 0) return;
    setStatus('Enviando…');
    const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: `${window.location.origin}/cadastro/confirmado` } });
    setStatus(error ? (/rate|seconds|limit/i.test(error.message) ? 'Aguarde um pouco antes de pedir outro e-mail.' : 'Não foi possível reenviar agora. Tente de novo em instantes.') : 'E-mail reenviado.');
    setWait(COOLDOWN);
  }
  return <div className="resend">
    <button type="button" className="secondary full" disabled={wait > 0} onClick={resend}>{wait > 0 ? `Reenviar e-mail em ${wait}s` : 'Reenviar e-mail de confirmação'}</button>
    {status && <p className="auth-switch">{status}</p>}
  </div>;
}

/** Etapa final do cadastro: a conta só funciona depois de confirmar o e-mail. */
export function ConfirmEmailStep({ email, onChangeEmail }: { email: string; onChangeEmail: () => void }) {
  return <div className="auth-confirmed">
    <div className="confirmed-check"><MailCheck size={30} /></div>
    <p className="eyebrow">Último passo</p>
    <h1>Confirme seu e-mail.</h1>
    <p className="auth-lead">Enviamos um link de confirmação para <b>{email}</b>. Abra o e-mail e clique em <b>Confirmar e-mail</b> para ativar sua conta.</p>
    <ul className="confirm-tips">
      <li>Não chegou em alguns minutos? <b>Confira a caixa de spam ou lixo eletrônico</b> e as abas Promoções e Atualizações.</li>
      <li>O remetente é <b>CasoZero</b> (contato@casozero.com.br).</li>
      <li>Você só consegue entrar depois de confirmar.</li>
    </ul>
    <ResendConfirmation email={email} startCooling />
    <button type="button" className="auth-back link-button" onClick={onChangeEmail}>Digitei o e-mail errado</button>
    <Link href="/login" className="auth-back">Já confirmei, quero entrar</Link>
  </div>;
}
