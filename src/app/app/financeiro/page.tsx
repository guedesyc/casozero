'use client';
import { PanelShell } from '@/components/panel/shell';
import { Finance } from '@/components/panel/finance';
export default function Page() { return <PanelShell>{(data, update) => <Finance data={data} update={update} />}</PanelShell>; }
