import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

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

  // A Stripe reenvia eventos; cada um é processado uma vez só.
  const { error: logError } = await supabase.from('stripe_webhook_events').upsert({ id: event.id, type: event.type, livemode: event.livemode }, { onConflict: 'id', ignoreDuplicates: true });
  if (logError) return NextResponse.json({ error: 'Falha ao registrar o evento.' }, { status: 500 });
  const { data: logged } = await supabase.from('stripe_webhook_events').select('processed_at').eq('id', event.id).maybeSingle();
  if (logged?.processed_at) return NextResponse.json({ received: true, duplicate: true });

  try { await handle(supabase, event); }
  catch (error) {
    await supabase.from('stripe_webhook_events').update({ error: error instanceof Error ? error.message : String(error) }).eq('id', event.id);
    return NextResponse.json({ error: 'Falha ao processar o evento.' }, { status: 500 });
  }
  await supabase.from('stripe_webhook_events').update({ processed_at: new Date().toISOString(), error: null }).eq('id', event.id);
  return NextResponse.json({ received: true });
}

/** Aplica o evento em `subscriptions`. Erro do banco faz a Stripe tentar de novo. */
async function handle(supabase: SupabaseClient, event: Stripe.Event) {
  const now = new Date().toISOString();
  const check = ({ error }: { error: { message: string } | null }) => { if (error) throw new Error(error.message); };
  switch (event.type) {
    // Compra concluída: cria a assinatura ligada ao usuário.
    case 'checkout.session.completed': {
      const session = event.data.object;
      const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
      if (!subscriptionId) break;
      check(await supabase.from('subscriptions').upsert({
        user_id: session.metadata?.user_id ?? session.client_reference_id ?? null,
        stripe_customer_id: typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null,
        stripe_subscription_id: subscriptionId,
        plan_id: session.metadata?.plan ?? 'unknown',
        status: 'active',
        updated_at: now,
      }, { onConflict: 'stripe_subscription_id' }));
      break;
    }
    // Troca de plano, renovação, cancelamento agendado ou encerrado.
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      const periodEnd = subscription.items.data[0]?.current_period_end;
      check(await supabase.from('subscriptions').update({
        status: event.type === 'customer.subscription.deleted' ? 'canceled' : STATUS[subscription.status] ?? subscription.status,
        ...(subscription.metadata?.plan ? { plan_id: subscription.metadata.plan } : {}),
        ...(periodEnd ? { current_period_end: new Date(periodEnd * 1000).toISOString() } : {}),
        updated_at: now,
      }).eq('stripe_subscription_id', subscription.id));
      break;
    }
    // Cobrança recusada: a assinatura fica pendente até o pagamento.
    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      const ref = invoice.parent?.subscription_details?.subscription;
      const subscriptionId = typeof ref === 'string' ? ref : ref?.id;
      if (subscriptionId) check(await supabase.from('subscriptions').update({ status: 'past_due', updated_at: now }).eq('stripe_subscription_id', subscriptionId));
      break;
    }
  }
}
