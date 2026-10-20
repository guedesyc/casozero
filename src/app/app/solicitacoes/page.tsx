'use client';
import { PanelShell } from '@/components/panel/shell';
import { RequestsList } from '@/components/panel/requests';
export default function Page() { return <PanelShell>{data => <RequestsList data={data} />}</PanelShell>; }
