'use client';
import { PanelShell } from '@/components/panel/shell';
import { ProfilePage } from '@/components/panel/settings';
export default function Page() { return <PanelShell>{(data, update) => <ProfilePage data={data} update={update} />}</PanelShell>; }
