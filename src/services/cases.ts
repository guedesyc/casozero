import { initialCases } from '@/mocks/data';
import { LegalCase, CaseStatus } from '@/types';
const key = 'casozero-cases';
export const casesService = {
 list(): LegalCase[] {
  if (typeof window === 'undefined') return initialCases;
  try {
   const saved = window.localStorage.getItem(key);
   if (!saved) return initialCases;
   const parsed = JSON.parse(saved);
   return Array.isArray(parsed) ? parsed : initialCases;
  } catch {
   window.localStorage.removeItem(key);
   return initialCases;
  }
 },
 get(id: string) { return this.list().find(c => c.id === id); },
 save(cases: LegalCase[]) { localStorage.setItem(key, JSON.stringify(cases)); },
 updateStatus(id: string, status: CaseStatus) { const cases = this.list().map(c => c.id === id ? {...c,status} : c); this.save(cases); return cases; },
  add(item: LegalCase) { const cases=this.list(); const nextNumber=cases.reduce((max,c)=>Math.max(max,c.caseNumber||0),0)+1; const normalized={...item,caseNumber:item.caseNumber||nextNumber,code:`CASO #${String(item.caseNumber||nextNumber).padStart(5,'0')}`}; const next=[normalized,...cases]; this.save(next); return next; },
 clear() { localStorage.removeItem(key); return initialCases; }
};
