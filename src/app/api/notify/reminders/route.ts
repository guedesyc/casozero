import { NextResponse } from 'next/server';
import { PROFESSIONS, ProfessionId } from '@/config/professions';
import { escapeHtml, mailHtml, sendMail, serverConfigured, serviceClient, SITE } from '@/lib/mailer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Due {
  id: string; kind: 'triage' | 'session'; date: string; time: string; email: string; name: string;
  professional: string; profession: ProfessionId; phone: string | null; trackToken: string | null;
}

const todayInSaoPaulo = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

/**
 * Chamada a cada 5 minutos pelo pg_cron do Supabase. Envia ao paciente o lembrete dos
 * atendimentos da próxima hora. Cada atendimento é marcado no banco antes do envio
 * (claim_due_reminders), então chamar de novo, por quem for, não repete e-mail.
 */
export async function POST() {
  if (!serverConfigured()) { console.warn('[reminders] SUPABASE_SERVICE_ROLE_KEY ou SMTP_PASSWORD ausente'); return NextResponse.json({ sent: 0 }); }
  const db = serviceClient();
  const { data, error } = await db.rpc('claim_due_reminders');
  if (error) { console.error('[reminders] falha ao buscar', error.message); return NextResponse.json({ sent: 0 }, { status: 500 }); }
  let sent = 0;
  for (const due of (data ?? []) as Due[]) {
    // Para o paciente, a triagem é a primeira consulta.
    const noun = due.kind === 'triage' ? 'consulta' : PROFESSIONS[due.profession]?.sessionNoun ?? 'sessão';
    const day = due.date === todayInSaoPaulo() ? 'hoje' : new Date(`${due.date}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Sao_Paulo' });
    const proFirst = due.professional.trim().split(/\s+/)[0];
    const digits = (due.phone ?? '').replace(/\D/g, '');
    const whatsapp = digits.length >= 10 ? `https://wa.me/${digits.startsWith('55') ? digits : `55${digits}`}` : '';
    const track = due.kind === 'triage' && due.trackToken ? `${SITE}/r/${due.trackToken}` : '';
    const text = [
      `Olá, ${due.name}!`,
      `Lembrete: sua ${noun} com ${due.professional} é ${day}, às ${due.time}.`,
      whatsapp ? `Se não puder comparecer, avise ${proFirst} pelo WhatsApp: ${whatsapp}` : `Se não puder comparecer, avise ${proFirst}.`,
      track ? `Detalhes do seu pedido: ${track}` : '',
      'CasoZero',
    ].filter(Boolean).join('\n\n');
    const html = mailHtml([
      `Olá, ${escapeHtml(due.name)}!`,
      `Lembrete: sua ${escapeHtml(noun)} com <b>${escapeHtml(due.professional)}</b> é <b>${escapeHtml(day)}, às ${escapeHtml(due.time)}</b>.`,
      `Se não puder comparecer, avise ${escapeHtml(proFirst)}${whatsapp ? '' : ' o quanto antes'}.`,
    ], whatsapp ? { href: whatsapp, label: `Falar com ${proFirst} no WhatsApp` } : track ? { href: track, label: 'Ver meu pedido' } : undefined,
    `Você recebe este lembrete porque informou seu e-mail ao marcar com ${escapeHtml(proFirst)} pelo CasoZero.`);
    try { await sendMail(due.email, `Lembrete: ${noun} ${day}, às ${due.time}`, text, html); sent++; }
    catch (sendError) {
      await db.rpc('release_reminder', { p_id: due.id });
      console.error('[reminders] falha ao enviar', sendError instanceof Error ? sendError.message : sendError);
    }
  }
  return NextResponse.json({ sent });
}
