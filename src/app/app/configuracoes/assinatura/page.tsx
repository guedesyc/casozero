'use client';
import { PanelShell } from '@/components/panel/shell';
import { SubscriptionPage } from '@/components/panel/settings';
export default function Page() { return <PanelShell>{data => <SubscriptionPage data={data} />}</PanelShell>; }
