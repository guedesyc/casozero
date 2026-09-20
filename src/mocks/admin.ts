import { Lawyer } from '@/types';

export const initialLawyers: (Lawyer & { id: string; email: string; phone: string; status: 'active' | 'invited' | 'paused'; plan: string; joinedAt: string; cases: number })[] = [
  { id: 'adv-001', slug: 'muriloguedes', name: 'Dr. Murilo Guedes', firm: 'Guedes Advocacia', city: 'Salvador - BA', areas: ['Trabalhista', 'Consumidor'], profile: 'Reclamante', preferences: ['Horas extras', 'FGTS', 'Rescisão'], email: 'murilo@guedesadvocacia.com.br', phone: '(71) 99999-1001', status: 'active', plan: 'Pro', joinedAt: '12 ago, 2026', cases: 10 },
  { id: 'adv-002', slug: 'julianamartins', name: 'Dra. Juliana Martins', firm: 'Martins & Associados', city: 'São Paulo - SP', areas: ['Família', 'Cível'], profile: 'Ambos', preferences: ['Guarda', 'Divórcio'], email: 'juliana@martinsassociados.com', phone: '(11) 98888-2202', status: 'active', plan: 'Solo', joinedAt: '28 ago, 2026', cases: 8 },
  { id: 'adv-003', slug: 'robertolima', name: 'Dr. Roberto Lima', firm: 'Lima Direito Empresarial', city: 'Recife - PE', areas: ['Empresarial', 'Cível'], profile: 'Empresa', preferences: ['Contratos', 'Societário'], email: 'roberto@limadireito.com', phone: '(81) 97777-3303', status: 'invited', plan: 'Pro', joinedAt: '15 set, 2026', cases: 0 },
  { id: 'adv-004', slug: 'carolinasa', name: 'Dra. Carolina Sá', firm: 'Carolina Sá Advocacia', city: 'Belo Horizonte - MG', areas: ['Previdenciário'], profile: 'Reclamante', preferences: ['Aposentadoria'], email: 'carolina@carol inasa.adv.br'.replace(' ', ''), phone: '(31) 96666-4404', status: 'paused', plan: 'Solo', joinedAt: '03 jul, 2026', cases: 14 },
];

export const lawyerService = {
  list() {
    if (typeof window === 'undefined') return initialLawyers;
    try {
      const saved = window.localStorage.getItem('casozero-admin-lawyers');
      if (!saved) return initialLawyers;
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : initialLawyers;
    } catch {
      window.localStorage.removeItem('casozero-admin-lawyers');
      return initialLawyers;
    }
  },
  save(items: typeof initialLawyers) { localStorage.setItem('casozero-admin-lawyers', JSON.stringify(items)); },
  update(id: string, values: Partial<typeof initialLawyers[number]>) { const next = this.list().map((item: typeof initialLawyers[number]) => item.id === id ? { ...item, ...values } : item); this.save(next); return next; },
  create(values: { name: string; email: string; firm: string; slug?: string }) { const items = this.list(); const base = (values.slug || values.firm || values.name).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '').slice(0, 28) || `advogado${items.length + 1}`; const used = new Set(items.map((item: typeof initialLawyers[number]) => item.slug)); let slug = base; let suffix = 2; while (used.has(slug)) slug = `${base}${suffix++}`; const item = { id: `adv-${String(Date.now()).slice(-6)}`, slug, name: values.name || 'Novo advogado', firm: values.firm || 'Novo escritório', city: 'A configurar', areas: ['Cível'] as Lawyer['areas'], profile: 'Ambos', preferences: [], email: values.email, phone: '', status: 'invited' as const, plan: 'Solo', joinedAt: 'Hoje', cases: 0 }; const next = [item, ...items]; this.save(next); return next; },
};
