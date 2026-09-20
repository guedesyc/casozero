'use client';
import { useEffect, useRef, useState } from 'react';

const assetBase = '/casozero';

export function IntroGate(){
 const [visible,setVisible]=useState(true); const [leaving,setLeaving]=useState(false); const videoRef=useRef<HTMLVideoElement>(null);
 const finish=()=>{setLeaving(true);window.setTimeout(()=>setVisible(false),650)};
 useEffect(()=>{const fallback=window.setTimeout(finish,15000);const video=videoRef.current;if(video){video.play().catch(finish)}return()=>window.clearTimeout(fallback)},[]);
 if(!visible)return null;
 return <div className={`intro-gate ${leaving?'leaving':''}`} aria-label="Abertura CasoZero"><video ref={videoRef} autoPlay muted playsInline preload="auto" poster={`${assetBase}/casozero-logo.png`} onEnded={finish} onError={finish}><source src={`${assetBase}/casozero-intro.mp4`} type="video/mp4"/><source src="/casozero-intro.mp4" type="video/mp4"/></video><button type="button" onClick={finish}>Pular abertura</button></div>;
}
