'use client';
import { PanelShell } from '@/components/panel/shell';
import { Agenda } from '@/components/panel/agenda';
export default function Page() { return <PanelShell>{(data, update) => <Agenda data={data} update={update} />}</PanelShell>; }
