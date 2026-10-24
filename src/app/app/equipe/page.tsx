'use client';
import { PanelShell } from '@/components/panel/shell';
import { TeamPage } from '@/components/panel/settings';
export default function Page() { return <PanelShell>{(data, update) => <TeamPage data={data} update={update} />}</PanelShell>; }
