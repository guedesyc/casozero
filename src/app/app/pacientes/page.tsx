'use client';
import { PanelShell } from '@/components/panel/shell';
import { PatientsList } from '@/components/panel/patients';
export default function Page() { return <PanelShell>{data => <PatientsList data={data} />}</PanelShell>; }
