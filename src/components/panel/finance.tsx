'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatBRL, formatMoney } from '@/config/plans';
import { formatDayMonth, today } from '@/lib/dates';
import { ClinicData, saveAccount, setPatientSessionPrice, useClinic } from '@/services/clinic';
import { FinanceState, monthFinance } from '@/services/finance';
import { Patient } from '@/types';
import { Block, PageTitle } from './shell';

type Update = ReturnType<typeof useClinic>['update'];
const STATE_LABELS: Record<FinanceState, string> = { done: 'Realizada', planned: 'Marcada', unrecorded: 'Sem registro', missed: 'Falta' };
const money = (value?: number) => value === undefined ? '—' : formatBRL(value);
const shiftMonth = (month: string, by: number) => { const [y, m] = month.split('-').map(Number); const d = new Date(y, m - 1 + by, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
const monthLabel = (month: string) => { const [y, m] = month.split('-').map(Number); const text = new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }); return text.charAt(0).toUpperCase() + text.slice(1); };

/** Campo do valor da sessão de um paciente; salva ao sair do campo ou com Enter. */
export function SessionPriceInput({ patient, update, compact = false }: { patient: Patient; update: Update; compact?: boolean }) {
  const shown = patient.sessionPrice === undefined ? '' : formatBRL(patient.sessionPrice);
  const [value, setValue] = useState(shown);
  const [error, setError] = useState('');
  useEffect(() => { setValue(shown); }, [shown]);
  const save = () => { if (value === shown) return; const r = update(d => setPatientSessionPrice(d, patient.id, value)); setError(r.error ?? ''); };
  return <span className={compact ? 'price-input compact' : 'price-input'}>
    <input value={value} onChange={e => { setValue(e.target.value); setError(''); }} onBlur={save} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} placeholder="Valor padrão" aria-label={`Valor da sessão de ${patient.name}`} inputMode="decimal" />
    {error && <small className="form-error">{error}</small>}
  </span>;
}

export function Finance({ data, update }: { data: ClinicData; update: Update }) {
  const [month, setMonth] = useState(today().slice(0, 7));
  const summary = useMemo(() => monthFinance(data, month), [data, month]);
  const [defaults, setDefaults] = useState({ sessionPrice: formatMoney(data.account.sessionPrice), triagePrice: formatMoney(data.account.triagePrice) });
  const [saved, setSaved] = useState(false);
  const dirty = defaults.sessionPrice !== formatMoney(data.account.sessionPrice) || defaults.triagePrice !== formatMoney(data.account.triagePrice);
  const saveDefaults = () => { update(d => saveAccount(d, { sessionPrice: formatMoney(defaults.sessionPrice), triagePrice: formatMoney(defaults.triagePrice) })); setDefaults({ sessionPrice: formatMoney(defaults.sessionPrice), triagePrice: formatMoney(defaults.triagePrice) }); setSaved(true); setTimeout(() => setSaved(false), 1800); };
  const total = summary.received + summary.expected;

  return <section className="page finance">
    <PageTitle eyebrow="Atendimento" title="Financeiro" text="Quanto entra no mês com as triagens e as sessões, pelo valor combinado com cada paciente.">
      <div className="month-switch"><button className="secondary small" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Mês anterior"><ChevronLeft size={16} /></button><strong>{monthLabel(month)}</strong><button className="secondary small" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Próximo mês"><ChevronRight size={16} /></button></div>
    </PageTitle>

    <div className="metrics">
      <div className="metric"><span>Recebido</span><strong>{formatBRL(summary.received)}</strong><p>atendimentos realizados</p></div>
      <div className="metric"><span>A receber</span><strong>{formatBRL(summary.expected)}</strong><p>atendimentos marcados</p></div>
      <div className="metric"><span>Total do mês</span><strong>{formatBRL(total)}</strong><p>realizados + marcados</p></div>
      <div className="metric"><span>Faltas</span><strong>{summary.missedCount}</strong><p>{summary.missedValue ? `${formatBRL(summary.missedValue)} que não entraram` : 'nenhum valor perdido'}</p></div>
    </div>

    {(summary.unrecorded > 0 || summary.withoutPrice > 0) && <div className="finance-alerts">
      {summary.unrecorded > 0 && <p><AlertTriangle size={15} /> {summary.unrecorded} atendimento(s) já passaram e continuam como marcados. Registre como realizado ou falta na <Link href="/app/agenda">Agenda</Link> para o valor ir para o lugar certo.</p>}
      {summary.withoutPrice > 0 && <p><AlertTriangle size={15} /> {summary.withoutPrice} atendimento(s) sem valor. Defina o valor da sessão de cada paciente abaixo, ou os valores padrão no fim da página.</p>}
    </div>}

    <Block title="Sessões por paciente">
      {summary.patients.length ? <div className="report-table-wrap"><table className="report-table finance-table">
        <thead><tr><th>Paciente</th><th>Valor da sessão</th><th>Realizadas</th><th>Marcadas</th><th>Faltas</th><th>Recebido</th><th>A receber</th></tr></thead>
        <tbody>{summary.patients.map(row => <tr key={row.patient.id}>
          <td><Link href={`/app/pacientes/detalhe/?id=${row.patient.id}`}>{row.patient.name}</Link></td>
          <td><SessionPriceInput patient={row.patient} update={update} compact />{row.patient.sessionPrice === undefined && row.price !== undefined && <small className="muted"> padrão {formatBRL(row.price)}</small>}</td>
          <td>{row.done}</td><td>{row.planned}</td><td>{row.missed}</td>
          <td>{formatBRL(row.received)}</td><td>{formatBRL(row.expected)}</td>
        </tr>)}</tbody>
      </table></div> : <p className="muted">Nenhuma sessão neste mês.</p>}
    </Block>

    <Block title={`Triagens (${summary.triages.length})`} className="spaced">
      {summary.triages.length ? <div className="report-table-wrap"><table className="report-table finance-table">
        <thead><tr><th>Paciente</th><th>Data</th><th>Serviço</th><th>Valor</th><th>Situação</th></tr></thead>
        <tbody>{summary.triages.map(({ appointment: a, value, state }) => { const request = data.requests.find(r => r.id === a.requestId); return <tr key={a.id}>
          <td>{request ? <Link href={`/app/solicitacoes/detalhe/?id=${request.id}`}>{a.title}</Link> : a.title}</td>
          <td>{formatDayMonth(a.date)}, {a.time}</td><td>{request?.service || '—'}</td><td>{money(value)}</td><td>{STATE_LABELS[state]}</td>
        </tr>; })}</tbody>
      </table></div> : <p className="muted">Nenhuma triagem neste mês.</p>}
    </Block>

    <Block title="Valores padrão" className="spaced">
      <p className="muted">Valem quando o paciente não tem valor próprio e quando a triagem não é de um serviço com preço. O preço de cada serviço (em Página pública) é o valor da triagem daquele serviço.</p>
      <div className="field-row">
        <label className="field"><span>Valor padrão da sessão</span><input value={defaults.sessionPrice} onChange={e => setDefaults({ ...defaults, sessionPrice: e.target.value })} onBlur={() => setDefaults(d => ({ ...d, sessionPrice: formatMoney(d.sessionPrice) }))} placeholder="Ex.: R$ 180,00" inputMode="decimal" /></label>
        <label className="field"><span>Valor padrão da triagem</span><input value={defaults.triagePrice} onChange={e => setDefaults({ ...defaults, triagePrice: e.target.value })} onBlur={() => setDefaults(d => ({ ...d, triagePrice: formatMoney(d.triagePrice) }))} placeholder="Ex.: R$ 100,00" inputMode="decimal" /></label>
      </div>
      <button className="primary small" disabled={!dirty} onClick={saveDefaults}>{saved ? 'Salvo' : 'Salvar valores'}</button>
    </Block>

    <p className="muted small-print">Os valores são calculados pelo que está cadastrado aqui. O pagamento é combinado direto entre você e o paciente; faltas e cancelamentos não entram no recebido.</p>
  </section>;
}
