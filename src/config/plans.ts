export type PlanId = 'caso_zero' | 'caso_um' | 'caso_dois' | 'caso_tres';
export const PLANS = {
  caso_zero: { id:'caso_zero' as const, name:'CasoZero', price:0, maxLawyers:1, monthlyIntakes:5, areaLinks:false, advancedAnalytics:false, customBranding:false, advancedCriteria:false, teamManagement:false, description:'Para começar.' },
  caso_um: { id:'caso_um' as const, name:'CasoUm', price:69.90, maxLawyers:1, monthlyIntakes:20, areaLinks:false, advancedAnalytics:false, customBranding:false, advancedCriteria:false, teamManagement:false, description:'Para organizar seus primeiros atendimentos.' },
  caso_dois: { id:'caso_dois' as const, name:'CasoDois', price:119.90, maxLawyers:1, monthlyIntakes:100, areaLinks:true, advancedAnalytics:true, customBranding:true, advancedCriteria:true, teamManagement:false, description:'Para uma operação organizada.' },
  caso_tres: { id:'caso_tres' as const, name:'CasoTrês', price:499.90, maxLawyers:1, monthlyIntakes:100, areaLinks:true, advancedAnalytics:true, customBranding:true, advancedCriteria:true, teamManagement:true, description:'Para profissionais com equipe.' },
} as const;
export const DEMO_SUBSCRIPTIONS = { caso_zero:{planId:'caso_zero' as PlanId,used:2,lawyers:1}, caso_um:{planId:'caso_um' as PlanId,used:12,lawyers:1}, caso_dois:{planId:'caso_dois' as PlanId,used:87,lawyers:1}, caso_tres:{planId:'caso_tres' as PlanId,used:94,lawyers:1} };
export const formatBRL=(value:number)=>value.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
