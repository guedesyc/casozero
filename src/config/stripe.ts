/**
 * Preços da Stripe por plano pago. Os IDs abaixo são da área de teste
 * (sandbox “CasoZero”); em produção, informe os preços da conta real nas
 * variáveis de ambiente do servidor. Com chave de produção (sk_live_) os
 * IDs de teste não são usados: sem a variável, o checkout avisa que falta o preço.
 */
const LIVE = process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_') ?? false;
export const STRIPE_PRICE_IDS = {
  profissional: process.env.STRIPE_PRICE_PROFISSIONAL ?? (LIVE ? '' : 'price_1UU7l8ErEkh81TJ5qOBXPsM2'),
  clinica: process.env.STRIPE_PRICE_CLINICA ?? (LIVE ? '' : 'price_1UU7lWErEkh81TJ5aGHrYQC0'),
} as const;

export type PaidPlanId = keyof typeof STRIPE_PRICE_IDS;
/** A Clínica é cobrada por profissional, com no mínimo 2. */
export const MIN_CLINIC_SEATS = 2;
