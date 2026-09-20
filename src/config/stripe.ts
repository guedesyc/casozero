export const STRIPE_PRICE_IDS = {
  caso_um: 'price_1UHn8aErEkh81TJ5ZETDV8oe',
  caso_dois: 'price_1UHn9CErEkh81TJ5tQiVqd5z',
  caso_tres: 'price_1UHnAiErEkh81TJ5MN9PIHF7',
  caso_zero: 'price_1UHn7AErEkh81TJ5q0tZzdZy',
} as const;

export type PaidPlanId = keyof typeof STRIPE_PRICE_IDS;
