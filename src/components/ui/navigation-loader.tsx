'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
export function LogoLoader(){return <div className="logo-loader" role="status" aria-label="Carregando"><div className="logo-loader-mark"><img src="/casozero-logo.png" alt="CasoZero"/></div><span>Carregando</span></div>}
export function NavigationLoader(){const[loading,setLoading]=useState(false);const pathname=usePathname();useEffect(()=>setLoading(false),[pathname]);useEffect(()=>{const click=(event:MouseEvent)=>{const anchor=(event.target as HTMLElement).closest('a');if(!anchor||anchor.target==='_blank'||anchor.hasAttribute('download'))return;const href=anchor.getAttribute('href');if(!href||href.startsWith('#')||href.startsWith('http')||href===window.location.pathname)return;setLoading(true)};document.addEventListener('click',click);return()=>document.removeEventListener('click',click)},[]);return loading?<div className="navigation-loader"><LogoLoader/></div>:null}
