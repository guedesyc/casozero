'use client';
import { PanelShell } from '@/components/panel/shell';
import { Dashboard } from '@/components/panel/dashboard';
export default function Page() { return <PanelShell>{(data, update) => <Dashboard data={data} update={update} />}</PanelShell>; }
