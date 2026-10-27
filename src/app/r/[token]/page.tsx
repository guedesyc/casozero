'use client';
import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import { CalendarDays, Check, Copy, MessageCircle } from 'lucide-react';
import { formatMoney } from '@/config/plans';
import { formatLong, formatShort, formatStamp } from '@/lib/dates';
import { supabase } from '@/lib/supabase';
import { fetchByTrackingToken, reportPayment, TrackedRequest } from '@/services/remote';

const TOKEN = /^[A-Za-z0-9_-]{40,80}$/;

/** Acompanhamento do pedido: status, data e o sinal por PIX (quando a profissional configurou). */
export default function TrackPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [info, setInfo] = useState<TrackedRequest | null | 'loading'>('loading');
  const [copied, setCopied] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState<string | undefined>();

  useEffect(() => {
    if (!TOKEN.test(token)) { setInfo(null); return; }
    if (!supabase) { setInfo(null); return; }
    fetchByTrackingToken(token).then(result => setInfo(result));
  }, [token]);

  if (info === 'loading') return <main className="public-shell"><section className="public-card"><p>Carregando…</p></section></main>;
  if (!info) return <main className="public-shell"><section className="public-card track-card">
    <p className="eyebrow">Link não encontrado</p>
    <h1>Não encontramos este pedido.</h1>
    <p className="lead">Confira se o endereço foi copiado por inteiro. Se precisar, peça um novo link para o profissional.</p>
  </section></main>;

  const first = info.professional.split(' ')[0];
  const wait = info.status === 'pending';
  const pix = (info.status === 'pending' || info.status === 'awaiting_payment') && info.pixKey;
  const paidAt = reported ?? info.paymentReportedAt;
  async function markPaid() {
    setReporting(true);
    const ok = await reportPayment(token);
    setReporting(false);
    if (ok) setReported(new Date().toISOString());
  }
  const phoneLink = info.contactPhone ? `https://wa.me/55${info.contactPhone.replace(/\D/g, '')}` : undefined;

  return <main className="public-shell"><section className="public-card track-card">
    <p className="eyebrow">Acompanhamento</p>
    <h1>Olá, {info.name}!</h1>
    <p className="lead">
      {info.status === 'pending' && <>Seu pedido de triagem foi enviado. {first} vai confirmar o horário em breve.</>}
      {info.status === 'awaiting_payment' && <>Sua vaga com {first} será firmada assim que o sinal por PIX for confirmado.</>}
      {info.status === 'confirmed' && <>Sua reserva da triagem está confirmada com {first}.</>}
      {info.status === 'continued' && <>Seu atendimento com {first} está confirmado. Obrigado pela confiança.</>}
      {info.status === 'declined' && <>Não foi possível atender este pedido. Entre em contato com {first} para mais detalhes.</>}
      {info.status === 'not_continued' && <>A triagem com {first} foi concluída.</>}
    </p>

    <div className="track-when">
      <CalendarDays size={18} />
      <div>
        <strong>{formatLong(info.scheduledDate ?? info.requestedDate)}</strong>
        <span>às {info.scheduledTime ?? info.requestedTime}{info.service ? ` · ${info.service}` : ''}</span>
      </div>
    </div>

    {pix && <div className="track-pix">
      <p className="eyebrow">Sinal da triagem</p>
      <p>{wait ? 'Para firmar a vaga, faça o PIX' : 'Caso ainda não tenha feito, o PIX garante a vaga'}{info.signalAmount ? <> de <b>{formatMoney(info.signalAmount)}</b></> : ''}:</p>
      <code>{info.pixKey}</code>
      {info.pixHolder && <p className="muted">Titular: {info.pixHolder}</p>}
      <button type="button" className="secondary small" onClick={() => { navigator.clipboard?.writeText(info.pixKey!); setCopied(true); }}>{copied ? <><Check size={14} /> Chave copiada</> : <><Copy size={14} /> Copiar chave PIX</>}</button>
      {paidAt
        ? <p className="paid-note"><Check size={15} /> Pagamento informado em {formatStamp(paidAt)}. {first} vai confirmar o sinal e a vaga fica firmada.</p>
        : info.status === 'awaiting_payment' && <button type="button" className="primary full paid-button" onClick={markPaid} disabled={reporting}>{reporting ? 'Registrando…' : 'Já paguei'}</button>}
    </div>}

    {phoneLink && <a className="secondary full track-contact" href={phoneLink} target="_blank" rel="noreferrer"><MessageCircle size={16} /> Falar com {first} pelo WhatsApp</a>}
    <p className="fineprint">Página do pedido de {formatShort(info.requestedDate)}. Guarde este link para voltar a ele.</p>
    <Link href={`/${info.slug}`} className="auth-back">Ir para a página de {first}</Link>
  </section></main>;
}
