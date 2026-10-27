import { NextResponse } from 'next/server';
import { escapeHtml, mailHtml, sendMail, serverConfigured, serviceClient, SITE } from '@/lib/mailer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Só avisa pedidos recém-criados: o link do paciente sozinho não serve para disparar e-mails depois. */
const WINDOW_MINUTES = 15;

const whenText = (date: string, time: string) => {
  const day = new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Sao_Paulo' });
  return `${day}, às ${time.slice(0, 5)}`;
};

/**
 * Chamado pela página pública logo depois do pedido de triagem. Manda à profissional
 * um e-mail curto (primeiro nome, horário e serviço; nada sobre saúde) com o link do painel.
 * Responde sempre 200 para não revelar se o token existe.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const token = typeof body.trackToken === 'string' ? body.trackToken : '';
  if (!/^[a-f0-9]{40,80}$/.test(token)) return NextResponse.json({ ok: true });
  if (!serverConfigured()) { console.warn('[notify] SUPABASE_SERVICE_ROLE_KEY ou SMTP_PASSWORD ausente'); return NextResponse.json({ ok: true }); }
  const db = serviceClient();

  // Marca como avisado antes de enviar: duas chamadas iguais não mandam dois e-mails.
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();
  const { data: claimed, error } = await db.from('triage_requests')
    .update({ notified_at: new Date().toISOString() })
    .eq('track_token', token).is('notified_at', null).gte('created_at', since)
    .select('professional_id, name, service, category, requested_date, requested_time').maybeSingle();
  if (error || !claimed) return NextResponse.json({ ok: true });

  const [{ data: user }, { data: pro }] = await Promise.all([
    db.auth.admin.getUserById(claimed.professional_id),
    db.from('professionals').select('name').eq('id', claimed.professional_id).maybeSingle(),
  ]);
  const to = user?.user?.email;
  if (!to) return NextResponse.json({ ok: true });

  const first = String(claimed.name).trim().split(/\s+/)[0];
  const proFirst = String(pro?.name ?? '').trim().split(/\s+/)[0];
  const when = whenText(claimed.requested_date, claimed.requested_time);
  const what = claimed.service || claimed.category;
  const link = `${SITE}/app/solicitacoes`;
  const text = `Olá${proFirst ? `, ${proFirst}` : ''}!\n\n${first} pediu uma triagem para ${when}${what ? ` (${what})` : ''}.\n\nConfirme, sugira outro horário ou recuse pelo painel:\n${link}\n\nCasoZero`;
  const html = mailHtml([
    `Olá${proFirst ? `, ${escapeHtml(proFirst)}` : ''}!`,
    `<b>${escapeHtml(first)}</b> pediu uma triagem para <b>${escapeHtml(when)}</b>${what ? ` (${escapeHtml(what)})` : ''}.`,
  ], { href: link, label: 'Ver o pedido' }, 'Por sigilo, os detalhes do pedido ficam só no painel. Você recebe este aviso porque tem uma página no CasoZero.');

  try { await sendMail(to, `Novo pedido de triagem: ${first}, ${when}`, text, html); }
  catch (sendError) {
    // Libera para uma nova tentativa e deixa o motivo no log do servidor.
    await db.from('triage_requests').update({ notified_at: null }).eq('track_token', token);
    console.error('[notify] falha ao enviar e-mail', sendError instanceof Error ? sendError.message : sendError);
  }
  return NextResponse.json({ ok: true });
}
