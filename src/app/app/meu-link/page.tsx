'use client';
import { PanelShell } from '@/components/panel/shell';
import { MyLinkPage } from '@/components/panel/settings';
export default function Page() { return <PanelShell>{(data, update) => <MyLinkPage data={data} update={update} />}</PanelShell>; }
