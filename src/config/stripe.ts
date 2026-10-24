/**
 * Preços da Stripe por plano pago. Os IDs abaixo são da área de teste
 * (sandbox “CasoZero”); em produção, informe os preços da conta real nas
 * variáveis de ambiente do servidor.
 */
export const STRIPE_PRICE_IDS = {
  profissional: process.env.STRIPE_PRICE_PROFISSIONAL ?? 'price_1UU7l8ErEkh81TJ5qOBXPsM2',
  clinica: process.env.STRIPE_PRICE_CLINICA ?? 'price_1UU7lWErEkh81TJ5aGHrYQC0',
} as const;

export type PaidPlanId = keyof typeof STRIPE_PRICE_IDS;
/** A Clínica é cobrada por profissional, com no mínimo 2. */
export const MIN_CLINIC_SEATS = 2;
