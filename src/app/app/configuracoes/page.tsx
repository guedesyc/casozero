'use client';
import { PanelShell } from '@/components/panel/shell';
import { AccountPage } from '@/components/panel/settings';
export default function Page() { return <PanelShell>{(data, update) => <AccountPage data={data} update={update} />}</PanelShell>; }
