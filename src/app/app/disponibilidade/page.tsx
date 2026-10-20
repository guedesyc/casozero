'use client';
import { PanelShell } from '@/components/panel/shell';
import { AvailabilityPage } from '@/components/panel/settings';
export default function Page() { return <PanelShell>{(data, update) => <AvailabilityPage data={data} update={update} />}</PanelShell>; }
