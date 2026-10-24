import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

/** Status da Stripe → status guardado em `subscriptions`. */
const STATUS: Partial<Record<Stripe.Subscription.Status, string>> = { active: 'active', trialing: 'active', past_due: 'past_due', unpaid: 'past_due', canceled: 'canceled', incomplete_expired: 'canceled', incomplete: 'incomplete', paused: 'paused' };

export async function POST(request: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !webhookSecret) return NextResponse.json({ error: 'Stripe webhook não configurado.' }, { status: 503 });
  const signature = request.headers.get('stripe-signature');
  if (!signature) return NextResponse.json({ error: 'Assinatura Stripe ausente.' }, { status: 400 });
  const payload = await request.text();
  const stripe = new Stripe(secret);
  let event: Stripe.Event;
  try { event = stripe.webhooks.constructEvent(payload, signature, webhookSecret); }
  catch { return NextResponse.json({ error: 'Assinatura do webhook inválida.' }, { status: 400 }); }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return NextResponse.json({ received: true, warning: 'Supabase server não configurado.' });
  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const now = new Date().toISOString();

  switch (event.type) {
    // Compra concluída: cria a assinatura ligada ao usuário.
    case 'checkout.session.completed': {
      const session = event.data.object;
      const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
      if (!subscriptionId) break;
      await supabase.from('subscriptions').upsert({
        user_id: session.metadata?.user_id ?? session.client_reference_id ?? null,
        stripe_customer_id: typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null,
        stripe_subscription_id: subscriptionId,
        plan_id: session.metadata?.plan ?? 'unknown',
        status: 'active',
        updated_at: now,
      }, { onConflict: 'stripe_subscription_id' });
      break;
    }
    // Troca de plano, renovação, cancelamento agendado ou encerrado.
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      const periodEnd = subscription.items.data[0]?.current_period_end;
      await supabase.from('subscriptions').update({
        status: event.type === 'customer.subscription.deleted' ? 'canceled' : STATUS[subscription.status] ?? subscription.status,
        ...(subscription.metadata?.plan ? { plan_id: subscription.metadata.plan } : {}),
        ...(periodEnd ? { current_period_end: new Date(periodEnd * 1000).toISOString() } : {}),
        updated_at: now,
      }).eq('stripe_subscription_id', subscription.id);
      break;
    }
    // Cobrança recusada: a assinatura fica pendente até o pagamento.
    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      const ref = invoice.parent?.subscription_details?.subscription;
      const subscriptionId = typeof ref === 'string' ? ref : ref?.id;
      if (subscriptionId) await supabase.from('subscriptions').update({ status: 'past_due', updated_at: now }).eq('stripe_subscription_id', subscriptionId);
      break;
    }
  }
  return NextResponse.json({ received: true });
}
