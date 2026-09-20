import { initialCases } from '@/mocks/data';
import { LegalCase, CaseStatus } from '@/types';
const key = 'casozero-cases';
const normalize = (items: LegalCase[]) => {
 const used = new Set<number>(); let next = Math.max(0, ...items.map(item => Number(item.caseNumber) || Number(item.id) || 0));
 return items.map(item => {
  let number = Number(item.caseNumber) || Number(item.id) || 0;
  if (!number || used.has(number)) { do { number += ++next; } while (used.has(number)); }
  used.add(number);
  return { ...item, caseNumber: number, code: item.code?.startsWith('CASO #') ? `CASO #${String(number).padStart(5,'0')}` : item.code };
 });
};
export const casesService = {
 list(): LegalCase[] {
  if (typeof window === 'undefined') return initialCases;
  try {
   const saved = window.localStorage.getItem(key);
   if (!saved) return initialCases;
   const parsed = JSON.parse(saved);
   return Array.isArray(parsed) ? normalize(parsed) : initialCases;
  } catch {
   window.localStorage.removeItem(key);
   return initialCases;
  }
 },
 get(id: string) { return this.list().find(c => c.id === id) || initialCases.find(c => c.id === id); },
 save(cases: LegalCase[]) { localStorage.setItem(key, JSON.stringify(cases)); },
 updateStatus(id: string, status: CaseStatus) { const cases = this.list().map(c => c.id === id ? {...c,status} : c); this.save(cases); return cases; },
 update(id: string, values: Partial<LegalCase>) { const cases = this.list().map(c => c.id === id ? {...c, ...values} : c); this.save(cases); return cases; },
  add(item: LegalCase) { const cases=this.list(); const nextNumber=cases.reduce((max,c)=>Math.max(max,c.caseNumber||0),0)+1; const normalized={...item,caseNumber:item.caseNumber||nextNumber,code:`CASO #${String(item.caseNumber||nextNumber).padStart(5,'0')}`}; const next=[normalized,...cases]; this.save(next); return next; },
 clear() { localStorage.removeItem(key); return initialCases; }
};
