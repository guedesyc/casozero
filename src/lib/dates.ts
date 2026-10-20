/** Datas sempre no formato local YYYY-MM-DD; horários em HH:MM. */
export const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const fromIso = (value: string) => new Date(`${value}T12:00:00`);
export const today = () => iso(new Date());
export const addDays = (value: string, days: number) => { const d = fromIso(value); d.setDate(d.getDate() + days); return iso(d); };
export const weekdayOf = (value: string) => fromIso(value).getDay();
export const toMinutes = (time: string) => { const [h, m] = time.split(':').map(Number); return h * 60 + m; };
export const toTime = (minutes: number) => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
export const at = (date: string, time: string) => new Date(`${date}T${time}:00`);

export const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
export const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const formatLong = (value: string) => fromIso(value).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
export const formatShort = (value: string) => fromIso(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
/** Data de um timestamp ISO no fuso local. */
export const formatStamp = (value: string) => new Date(value).toLocaleDateString('pt-BR');
export const formatDayMonth = (value: string) => fromIso(value).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

/** Dias de um mês com espaços no início para alinhar ao dia da semana. */
export function monthGrid(year: number, month: number): (string | null)[] {
  const first = new Date(year, month, 1).getDay();
  const count = new Date(year, month + 1, 0).getDate();
  return [...Array(first).fill(null), ...Array.from({ length: count }, (_, i) => iso(new Date(year, month, i + 1)))];
}
