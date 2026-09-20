'use client';
import { useState } from 'react';
export function IntroGate(){const [visible,setVisible]=useState(true);const [leaving,setLeaving]=useState(false);const finish=()=>{setLeaving(true);window.setTimeout(()=>setVisible(false),700)};if(!visible)return null;return <div className={`intro-gate ${leaving?'leaving':''}`}><video autoPlay muted playsInline onEnded={finish} onError={finish} src="/casozero/casozero-intro.mp4"/><button onClick={finish}>Pular abertura</button></div>}
