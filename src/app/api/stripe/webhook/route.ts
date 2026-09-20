import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

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
  const object = event.data.object as Stripe.Checkout.Session | Stripe.Subscription | Stripe.Invoice;
  const subscription = event.type === 'checkout.session.completed' ? object as Stripe.Checkout.Session : null;
  const subscriptionId = subscription?.subscription as string | null;
  const customerId = subscription?.customer as string | null;
  const plan = subscription?.metadata?.plan ?? null;
  const status = event.type === 'checkout.session.completed' ? 'active' : event.type.includes('payment_failed') ? 'past_due' : event.type.includes('deleted') ? 'canceled' : 'active';
  if (subscriptionId || customerId) {
    await supabase.from('subscriptions').upsert({ stripe_customer_id: customerId, stripe_subscription_id: subscriptionId, plan_id: plan, status, updated_at: new Date().toISOString() }, { onConflict: 'stripe_subscription_id' });
  }
  return NextResponse.json({ received: true });
}
