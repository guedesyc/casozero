'use client';
import { PanelShell } from '@/components/panel/shell';
import { PublicPageEditor } from '@/components/panel/settings';
export default function Page() { return <PanelShell>{(data, update) => <PublicPageEditor data={data} update={update} />}</PanelShell>; }
