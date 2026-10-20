export type PlanId = 'caso_zero' | 'caso_um' | 'caso_dois' | 'caso_tres';
export interface Plan { id: PlanId; name: string; price: number; maxProfessionals: number; monthlyTriages: number; description: string; items: string[]; featured?: boolean; }

/** Limite cobrado = novas triagens recebidas pelo link no mês. Pacientes em acompanhamento não contam. */
export const PLANS: Record<PlanId, Plan> = {
  caso_zero: { id: 'caso_zero', name: 'CasoZero', price: 0, maxProfessionals: 1, monthlyTriages: 5, description: 'Para começar.', items: ['1 profissional', '5 triagens por mês', 'Link com agendamento', 'Agenda e pacientes', 'Caderneta por sessão'] },
  caso_um: { id: 'caso_um', name: 'CasoUm', price: 69.90, maxProfessionals: 1, monthlyTriages: 20, description: 'Para organizar a agenda de quem está crescendo.', items: ['1 profissional', '20 triagens por mês', 'Link com agendamento', 'Agenda e pacientes', 'Caderneta e evolução'] },
  caso_dois: { id: 'caso_dois', name: 'CasoDois', price: 119.90, maxProfessionals: 1, monthlyTriages: 100, description: 'Para uma rotina cheia, sem triagem perdida.', items: ['1 profissional', '100 triagens por mês', 'Link com agendamento', 'Agenda e pacientes', 'Caderneta e evolução', 'Links por demanda'], featured: true },
  caso_tres: { id: 'caso_tres', name: 'CasoTrês', price: 299.90, maxProfessionals: 10, monthlyTriages: 300, description: 'Para clínicas e consultórios compartilhados.', items: ['Até 10 profissionais', '300 triagens por mês', 'Tudo do CasoDois', 'Agenda por profissional'] },
};
export const formatBRL = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
