'use client';
import { useEffect, useState } from 'react';
import { Portal } from '@/components/lawyer/portal';

export default function CaseDetailPage(){
 const [id,setId]=useState<string>();
 useEffect(()=>setId(new URLSearchParams(window.location.search).get('id')||undefined),[]);
 if(!id)return <div className="app-loading">Carregando caso...</div>;
 return <Portal view="detail" id={id}/>;
}
