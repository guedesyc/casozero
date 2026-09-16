import { initialCases } from '@/mocks/data';
import { LegalCase, CaseStatus } from '@/types';
const key = 'casozero-cases';
export const casesService = {
 list(): LegalCase[] { if (typeof window === 'undefined') return initialCases; const saved = localStorage.getItem(key); return saved ? JSON.parse(saved) : initialCases; },
 get(id: string) { return this.list().find(c => c.id === id); },
 save(cases: LegalCase[]) { localStorage.setItem(key, JSON.stringify(cases)); },
 updateStatus(id: string, status: CaseStatus) { const cases = this.list().map(c => c.id === id ? {...c,status} : c); this.save(cases); return cases; },
 add(item: LegalCase) { const cases=[item,...this.list()]; this.save(cases); return cases; },
 clear() { localStorage.removeItem(key); return initialCases; }
};
