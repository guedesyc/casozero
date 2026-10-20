'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PanelShell } from '@/components/panel/shell';
import { RequestDetail } from '@/components/panel/requests';
function Detail() { const id = useSearchParams().get('id') ?? undefined; return <PanelShell>{(data, update) => <RequestDetail key={id} id={id} data={data} update={update} />}</PanelShell>; }
export default function Page() { return <Suspense><Detail /></Suspense>; }
