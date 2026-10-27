import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

/** Só no servidor: e-mails do CasoZero pelo SMTP da Hostinger (contato@casozero.com.br). */
export const SITE = 'https://casozero.com.br';
const user = () => process.env.SMTP_USER ?? 'contato@casozero.com.br';

export function serverConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.SMTP_PASSWORD);
}

export const serviceClient = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

export async function sendMail(to: string, subject: string, text: string, html: string) {
  const port = Number(process.env.SMTP_PORT ?? 465);
  const transport = nodemailer.createTransport({ host: process.env.SMTP_HOST ?? 'smtp.hostinger.com', port, secure: port === 465, auth: { user: user(), pass: process.env.SMTP_PASSWORD } });
  await transport.sendMail({ from: `CasoZero <${user()}>`, to, subject, text, html });
}

export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/** Moldura simples dos e-mails: parágrafos já escapados, botão opcional e rodapé. */
export function mailHtml(paragraphs: string[], button?: { href: string; label: string }, footer?: string) {
  return `<div style="font-family:Arial,sans-serif;font-size:15px;color:#11100f;line-height:1.5;max-width:520px">
${paragraphs.map(p => `<p>${p}</p>`).join('\n')}
${button ? `<p><a href="${button.href}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px;font-weight:bold">${escapeHtml(button.label)}</a></p>` : ''}
${footer ? `<p style="color:#67625c;font-size:12px">${footer}</p>` : ''}
</div>`;
}
