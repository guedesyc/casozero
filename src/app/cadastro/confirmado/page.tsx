'use client';
import Link from 'next/link';
import { Check } from 'lucide-react';
export default function ConfirmedPage(){return <main className="auth-page"><section className="auth-card auth-confirmed"><div className="confirmed-check"><Check size={30}/></div><p className="eyebrow">Cadastro confirmado</p><h1>Conta criada com sucesso.</h1><p className="auth-lead">Agora escolha o plano ideal para começar a usar o CasoZero.</p><Link href="/precos" className="primary full">Escolher meu plano</Link><p className="auth-switch">Depois da escolha, entre com seu e-mail e senha para acessar sua conta.</p><Link href="/login" className="auth-back">Ir para login</Link></section></main>}
