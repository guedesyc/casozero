export type PlanId = 'gratis' | 'profissional' | 'clinica';
export interface Plan {
  id: PlanId;
  name: string;
  /** Preço mensal; na Clínica é por profissional. */
  price: number;
  perProfessional?: boolean;
  /** Total de pacientes cadastrados; alta ou pausa não liberam vaga (undefined = sem limite). */
  maxPatients?: number;
  /** Agenda compartilhada e equipe com secretária. */
  team: boolean;
  description: string;
  items: string[];
  featured?: boolean;
}

/** Todos os recursos estão em todos os planos; o Grátis só limita o total de pacientes. */
export const PLANS: Record<PlanId, Plan> = {
  gratis: { id: 'gratis', name: 'Grátis', price: 0, maxPatients: 5, team: false, description: 'Tudo liberado para até 5 pacientes.', items: ['Até 5 pacientes', 'Página pública e agendamento', 'Agenda e horários fixos', 'Caderneta e evolução', 'Todos os recursos liberados'] },
  profissional: { id: 'profissional', name: 'Profissional', price: 49.90, team: false, description: 'Para quem atende por conta própria, sem limite nenhum.', items: ['Pacientes ilimitados', 'Página pública e agendamento', 'Agenda e horários fixos', 'Caderneta e evolução', 'Todos os recursos liberados'], featured: true },
  clinica: { id: 'clinica', name: 'Clínica', price: 39.90, perProfessional: true, team: true, description: 'Para consultórios com mais de um profissional.', items: ['Tudo do Profissional, para cada profissional', 'Agenda compartilhada', 'Secretária com acesso só à agenda', 'A caderneta continua visível só para cada profissional'] },
};

export const LEGACY_PLAN_IDS: Record<string, PlanId> = { caso_zero: 'gratis', caso_um: 'profissional', caso_dois: 'profissional', caso_tres: 'clinica' };
export const toPlanId = (value?: string | null): PlanId | undefined => !value ? undefined : value in PLANS ? value as PlanId : LEGACY_PLAN_IDS[value];
export const formatBRL = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const priceLabel = (plan: Plan) => plan.price === 0 ? 'Grátis' : `${formatBRL(plan.price)}/mês${plan.perProfessional ? ' por profissional' : ''}`;

/** Valor digitado livremente ("60", "60,00", "R$ 1.200,50") → "R$ 60,00". Sem número, devolve o texto como veio. */
export function formatMoney(value?: string) {
  const raw = (value ?? '').replace(/R\$|\s/g, '');
  if (!raw) return '';
  // Vírgula é decimal; ponto em grupos de 3 dígitos ("1.200") é separador de milhar.
  const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : /^\d{1,3}(\.\d{3})+$/.test(raw) ? raw.replace(/\./g, '') : raw;
  const amount = Number(normalized);
  return Number.isFinite(amount) ? formatBRL(amount) : value!.trim();
}
