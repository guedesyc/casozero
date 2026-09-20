import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { STRIPE_PRICE_IDS, PaidPlanId } from '@/config/stripe';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: 'Stripe não configurada no servidor.' }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  const plan = body.plan as PaidPlanId;
  if (!plan || plan === 'caso_zero' || !STRIPE_PRICE_IDS[plan]) return NextResponse.json({ error: 'Plano inválido.' }, { status: 400 });
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const authorization = request.headers.get('authorization');
  if (!supabaseUrl || !anonKey || !authorization?.startsWith('Bearer ')) return NextResponse.json({ error: 'Faça login antes de escolher um plano.' }, { status: 401 });
  const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const { data: { user }, error: authError } = await authClient.auth.getUser(authorization.slice(7));
  if (authError || !user) return NextResponse.json({ error: 'Sessão inválida. Entre novamente.' }, { status: 401 });
  const stripe = new Stripe(secret);
  const origin = request.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: STRIPE_PRICE_IDS[plan], quantity: 1 }],
    success_url: `${origin}/login?checkout=success`,
    cancel_url: `${origin}/precos?checkout=cancelled`,
    allow_promotion_codes: true,
    billing_address_collection: 'auto',
    metadata: { plan, user_id: user.id },
    client_reference_id: user.id,
  });
  return NextResponse.json({ url: session.url });
}
