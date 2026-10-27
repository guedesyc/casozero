import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { MIN_CLINIC_SEATS, STRIPE_PRICE_IDS, PaidPlanId } from '@/config/stripe';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

/** Assinaturas que ainda cobram: trocar de plano altera estas em vez de criar outra. */
const LIVE_STATUSES: Stripe.Subscription.Status[] = ['active', 'trialing', 'past_due', 'unpaid'];

export async function POST(request: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: 'Stripe não configurada no servidor.' }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  const plan = body.plan as PaidPlanId | 'gratis';
  if (plan !== 'gratis' && !(plan in STRIPE_PRICE_IDS)) return NextResponse.json({ error: 'Plano inválido.' }, { status: 400 });
  const price = plan === 'gratis' ? undefined : STRIPE_PRICE_IDS[plan];
  if (plan !== 'gratis' && !price) return NextResponse.json({ error: 'Preço deste plano ainda não configurado na Stripe.' }, { status: 503 });
  // Clínica: uma unidade por profissional.
  const quantity = plan === 'clinica' ? Math.min(100, Math.max(MIN_CLINIC_SEATS, Math.floor(Number(body.seats) || MIN_CLINIC_SEATS))) : 1;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const authorization = request.headers.get('authorization');
  if (!supabaseUrl || !anonKey || !authorization?.startsWith('Bearer ')) return NextResponse.json({ error: 'Faça login antes de escolher um plano.' }, { status: 401 });
  // Com o token do usuário, a RLS só deixa ler a própria assinatura.
  const db = createClient(supabaseUrl, anonKey, { auth: { persistSession: false }, global: { headers: { Authorization: authorization } } });
  const { data: { user }, error: authError } = await db.auth.getUser(authorization.slice(7));
  if (authError || !user) return NextResponse.json({ error: 'Sessão inválida. Entre novamente.' }, { status: 401 });
  const stripe = new Stripe(secret);

  // Já assina: troca o preço da assinatura atual (ou agenda o cancelamento) em vez de abrir outro checkout.
  const { data: row } = await db.from('subscriptions').select('stripe_subscription_id').eq('user_id', user.id).in('status', ['active', 'past_due']).order('updated_at', { ascending: false }).limit(1).maybeSingle();
  const current = row?.stripe_subscription_id ? await stripe.subscriptions.retrieve(row.stripe_subscription_id).catch(() => null) : null;
  if (current && LIVE_STATUSES.includes(current.status)) {
    if (plan === 'gratis') {
      const canceled = await stripe.subscriptions.update(current.id, { cancel_at_period_end: true });
      const periodEnd = canceled.items.data[0]?.current_period_end;
      return NextResponse.json({ cancelAt: periodEnd ? new Date(periodEnd * 1000).toISOString() : null });
    }
    const [first, ...rest] = current.items.data;
    await stripe.subscriptions.update(current.id, {
      items: [{ id: first.id, price, quantity }, ...rest.map(item => ({ id: item.id, deleted: true }))],
      proration_behavior: 'create_prorations',
      // Voltar a um plano pago desfaz um cancelamento agendado.
      cancel_at_period_end: false,
      // O webhook (customer.subscription.updated) grava o plano a partir daqui.
      metadata: { plan, user_id: user.id },
    });
    return NextResponse.json({ switched: plan });
  }
  // Sem assinatura paga, o Grátis não passa pela Stripe.
  if (plan === 'gratis') return NextResponse.json({ free: true });

  // A volta do checkout só vai para o próprio site, nunca para uma origem informada por quem chama.
  const sent = request.headers.get('origin') ?? '';
  const origin = /^https:\/\/(www\.)?casozero\.com\.br$|^http:\/\/localhost:\d+$/.test(sent) ? sent : process.env.NEXT_PUBLIC_APP_URL ?? 'https://casozero.com.br';
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price, quantity }],
    success_url: `${origin}/app/configuracoes/assinatura?checkout=success`,
    cancel_url: `${origin}/app/configuracoes/assinatura?checkout=cancelled`,
    allow_promotion_codes: true,
    billing_address_collection: 'auto',
    metadata: { plan, user_id: user.id },
    // Os eventos da assinatura (troca, cancelamento) também precisam saber o plano.
    subscription_data: { metadata: { plan, user_id: user.id } },
    client_reference_id: user.id,
  });
  return NextResponse.json({ url: session.url });
}
