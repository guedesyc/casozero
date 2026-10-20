'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PanelShell } from '@/components/panel/shell';
import { PatientDetail } from '@/components/panel/patients';
function Detail() { const params = useSearchParams(); const id = params.get('id') ?? undefined; const session = params.get('sessao') ?? undefined; return <PanelShell>{(data, update) => <PatientDetail key={id} id={id} sessionId={session} data={data} update={update} />}</PanelShell>; }
export default function Page() { return <Suspense><Detail /></Suspense>; }
