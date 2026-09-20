import { AgendaEntry } from '@/types';

const key = 'casozero-agenda';
export const agendaService = {
  list(): AgendaEntry[] {
    if (typeof window === 'undefined') return [];
    try { const value = JSON.parse(window.localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value : []; }
    catch { window.localStorage.removeItem(key); return []; }
  },
  save(entries: AgendaEntry[]) { window.localStorage.setItem(key, JSON.stringify(entries)); return entries; },
  add(entry: AgendaEntry) { return this.save([entry, ...this.list()].sort((a,b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`))); },
  toggle(id: string) { return this.save(this.list().map(item => item.id === id ? {...item, completed: !item.completed} : item)); },
};
