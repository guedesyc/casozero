import Link from 'next/link';
import { ArrowRight, BadgeDollarSign, BellRing, CalendarCheck, Check, FileLock2, Link2, MessageCircle, NotebookPen, QrCode, Repeat, ShieldCheck } from 'lucide-react';
import { BrandLockup } from '@/components/ui/brand';
import { PLANS, priceLabel } from '@/config/plans';
import { PROFESSION_LIST } from '@/config/professions';

const STEPS = [
  { image: 'pagina-publica', phone: 'pedido', eyebrow: '1. Seu link', title: 'O paciente marca a triagem sozinho', text: 'Você ganha uma página com foto, serviços e o que atende. O paciente conta o que procura tratar, deixa nome e telefone e escolhe um horário livre da sua agenda. Nada de troca de mensagens para achar horário.' },
  { image: 'painel', eyebrow: '2. Você confirma', title: 'Confirme, sugira outro horário ou recuse', text: 'O pedido chega no painel e no seu e-mail. Um clique confirma e abre o WhatsApp com a mensagem pronta, com o link de acompanhamento e, se quiser, a chave PIX do sinal.' },
  { image: 'caderneta', eyebrow: '3. Cada sessão registrada', title: 'Caderneta e evolução do paciente', text: 'Depois da triagem, defina o horário fixo e as sessões entram sozinhas na agenda. Cada uma ganha uma página na caderneta, e a evolução vira uma linha do tempo que você baixa em PDF.' },
  { image: 'financeiro', eyebrow: '4. Quanto entra no mês', title: 'Financeiro por paciente', text: 'Defina o valor da sessão de cada paciente e veja o recebido, o que ainda vai entrar e as faltas do mês, sem planilha.' },
];

const FEATURES = [
  { icon: Link2, title: 'Página e link próprios', text: 'Foto, capa, serviços, demandas e um QR Code para divulgar.' },
  { icon: CalendarCheck, title: 'Triagem sem conversa', text: 'Só aparecem os horários livres; nada se sobrepõe.' },
  { icon: MessageCircle, title: 'Confirmação pelo WhatsApp', text: 'Mensagens prontas para confirmar, sugerir horário e avisar.' },
  { icon: QrCode, title: 'Sinal por PIX', text: 'O paciente avisa que pagou e você confirma com um clique.' },
  { icon: BellRing, title: 'Lembrete por e-mail', text: 'O paciente recebe um aviso 1h antes de cada atendimento.' },
  { icon: Repeat, title: 'Agenda que se preenche', text: 'Paciente semanal ou quinzenal: defina uma vez e pronto.' },
  { icon: NotebookPen, title: 'Caderneta e evolução', text: 'Anotações por sessão, busca e PDF da evolução.' },
  { icon: BadgeDollarSign, title: 'Financeiro', text: 'Valor por paciente, recebido, a receber e faltas do mês.' },
];

const FAQ = [
  { q: 'Preciso pagar para começar?', a: 'Não. O plano Grátis tem todos os recursos para até 5 pacientes e não pede cartão. Quando quiser atender mais pacientes, você passa para o Profissional.' },
  { q: 'Meus pacientes precisam criar conta?', a: 'Não. O paciente só preenche o pedido no seu link e acompanha tudo por um link próprio, sem senha.' },
  { q: 'As anotações das sessões ficam seguras?', a: 'Sim. A conexão é criptografada, cada profissional só acessa os próprios dados (garantido no banco, não só na tela) e cada abertura ou edição da caderneta fica registrada. O painel de administração do CasoZero mostra só números, nunca o conteúdo da caderneta.' },
  { q: 'O CasoZero segue a LGPD?', a: 'Sim. O paciente autoriza o uso dos dados no pedido, você é a controladora dos dados dos seus pacientes e o CasoZero só os guarda para prestar o serviço. Os detalhes estão na Política de privacidade.' },
  { q: 'Para quais profissões serve?', a: 'Para quem atende por conta própria na saúde: psicologia, psicanálise, fisioterapia, fonoaudiologia, nutrição, terapia ocupacional, psicopedagogia, terapias integrativas e educação física.' },
  { q: 'Posso cancelar quando quiser?', a: 'Sim. O cancelamento é pelo painel, o plano vale até o fim do período pago e nenhum dado é apagado: você volta para o Grátis.' },
];

const Shot = ({ name, alt, className = '' }: { name: string; alt: string; className?: string }) =>
  // eslint-disable-next-line @next/next/no-img-element
  <img src={`/landing/${name}.webp`} alt={alt} loading="lazy" className={className} />;

export default function Home() {
  const plans = Object.values(PLANS);
  return <main className="lp">
    <nav className="lp-nav"><div className="lp-wrap lp-nav-in">
      <Link href="/" className="brand-lockup lp-logo" aria-label="CasoZero"><BrandLockup /></Link>
      <div className="lp-links"><a href="#como-funciona">Como funciona</a><a href="#recursos">Recursos</a><a href="#planos">Planos</a><a href="#duvidas">Dúvidas</a></div>
      <div className="lp-nav-actions"><Link href="/login" className="lp-login">Entrar</Link><Link href="/cadastro" className="lp-btn lp-btn-dark lp-btn-sm">Criar conta grátis</Link></div>
    </div></nav>

    <section className="lp-hero"><div className="lp-wrap lp-hero-in">
      <div className="lp-hero-copy">
        <p className="lp-eyebrow">Para profissionais da saúde que atendem por conta própria</p>
        <h1>Agenda, triagem e caderneta <em>em um só lugar.</em></h1>
        <p className="lp-lead">O paciente marca pelo seu link, recebe lembrete por e-mail e você registra cada sessão. Sem planilha e sem troca de mensagens para achar horário.</p>
        <div className="lp-hero-actions"><Link href="/cadastro" className="lp-btn lp-btn-dark">Criar conta grátis <ArrowRight size={17} /></Link><a href="#como-funciona" className="lp-btn lp-btn-light">Ver como funciona</a></div>
        <p className="lp-note"><Check size={15} /> Grátis para até 5 pacientes · sem cartão de crédito</p>
      </div>
      <div className="lp-hero-visual" aria-hidden="true">
        <div className="lp-browser"><div className="lp-browser-bar"><i /><i /><i /><span>casozero.com.br/app</span></div><Shot name="painel" alt="" /></div>
        <div className="lp-phone"><Shot name="pagina-publica" alt="" /></div>
      </div>
    </div></section>

    <section className="lp-professions" aria-label="Profissões atendidas"><div className="lp-wrap">
      <p>Feito para</p>
      <ul>{PROFESSION_LIST.map(p => <li key={p.id}>{p.label}</li>)}</ul>
    </div></section>

    <section id="como-funciona" className="lp-section"><div className="lp-wrap">
      <div className="lp-heading"><p className="lp-eyebrow">Como funciona</p><h2>Do primeiro contato <em>à sessão de número cem.</em></h2></div>
      <div className="lp-steps">{STEPS.map((s, i) => <article key={s.title} className={`lp-step ${i % 2 ? 'lp-step-rev' : ''}`}>
        <div className="lp-step-copy"><p className="lp-eyebrow">{s.eyebrow}</p><h3>{s.title}</h3><p>{s.text}</p></div>
        <div className={`lp-step-visual ${s.phone ? 'lp-step-phones' : ''}`}>
          {s.phone ? <><div className="lp-phone"><Shot name={s.image} alt="Página pública de uma profissional, com foto e botão para marcar consulta" /></div><div className="lp-phone lp-phone-offset"><Shot name={s.phone} alt="Formulário de pedido de triagem" /></div></>
            : <div className="lp-browser"><div className="lp-browser-bar"><i /><i /><i /></div><Shot name={s.image} alt={s.title} /></div>}
        </div>
      </article>)}</div>
    </div></section>

    <section id="recursos" className="lp-section lp-soft"><div className="lp-wrap">
      <div className="lp-heading lp-center"><p className="lp-eyebrow">Recursos</p><h2>Tudo o que o consultório precisa, <em>sem complicar.</em></h2><p>Todos os recursos estão em todos os planos.</p></div>
      <div className="lp-features">{FEATURES.map(({ icon: Icon, title, text }) => <article key={title}><Icon size={20} /><h3>{title}</h3><p>{text}</p></article>)}</div>
    </div></section>

    <section className="lp-section lp-dark"><div className="lp-wrap lp-trust">
      <div><p className="lp-eyebrow">Sigilo e LGPD</p><h2>O que é do paciente <em>fica entre vocês.</em></h2><p>Você lida com dado de saúde. O CasoZero foi pensado para isso desde o começo.</p><Link href="/privacidade" className="lp-btn lp-btn-light">Ler a política de privacidade</Link></div>
      <ul>
        <li><ShieldCheck size={18} /><span><b>Acesso só seu.</b> Cada profissional vê apenas os próprios dados, com a regra garantida no banco de dados.</span></li>
        <li><FileLock2 size={18} /><span><b>Registro de acesso.</b> Cada abertura, edição ou PDF da caderneta fica anotado, e ninguém apaga esse histórico.</span></li>
        <li><Link2 size={18} /><span><b>Página pública sem exposição.</b> Ela mostra os horários ocupados sem nomes, e o link de cada paciente é aleatório e fora dos buscadores.</span></li>
        <li><Check size={18} /><span><b>Consentimento no pedido.</b> O paciente autoriza o uso dos dados antes de enviar.</span></li>
      </ul>
    </div></section>

    <section id="planos" className="lp-section"><div className="lp-wrap">
      <div className="lp-heading lp-center"><p className="lp-eyebrow">Planos</p><h2>Comece grátis. <em>Cresça quando quiser.</em></h2></div>
      <div className="lp-plans">{plans.map(p => <article key={p.id} className={`lp-plan ${p.featured ? 'lp-plan-featured' : ''}`}>
        {p.featured && <span className="lp-tag">Mais escolhido</span>}{p.comingSoon && <span className="lp-tag lp-tag-soft">Em breve</span>}
        <h3>{p.name}</h3><p className="lp-plan-price">{p.price === 0 ? 'R$ 0/mês' : priceLabel(p)}</p><p className="lp-plan-desc">{p.description}</p>
        <ul>{p.items.map(item => <li key={item}><Check size={15} />{item}</li>)}</ul>
        {p.comingSoon ? <span className="lp-btn lp-btn-light lp-btn-block lp-disabled">Em breve</span>
          : <Link href={p.id === 'gratis' ? '/cadastro' : '/precos'} className={`lp-btn lp-btn-block ${p.featured ? 'lp-btn-dark' : 'lp-btn-light'}`}>{p.id === 'gratis' ? 'Criar conta grátis' : `Assinar o ${p.name}`}</Link>}
      </article>)}</div>
    </div></section>

    <section id="duvidas" className="lp-section lp-soft"><div className="lp-wrap lp-faq">
      <div className="lp-heading"><p className="lp-eyebrow">Dúvidas</p><h2>Perguntas <em>frequentes.</em></h2><p>Não achou sua resposta? Escreva para <a href="mailto:contato@casozero.com.br">contato@casozero.com.br</a>.</p></div>
      <div>{FAQ.map(f => <details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>)}</div>
    </div></section>

    <section className="lp-cta"><div className="lp-wrap">
      <h2>Seu consultório, <em>organizado em um link.</em></h2>
      <p>Crie sua conta em 2 minutos e compartilhe seu link hoje mesmo.</p>
      <Link href="/cadastro" className="lp-btn lp-btn-dark">Criar conta grátis <ArrowRight size={17} /></Link>
    </div></section>

    <footer className="lp-footer"><div className="lp-wrap lp-footer-in">
      <Link href="/" className="brand-lockup lp-logo" aria-label="CasoZero"><BrandLockup /></Link>
      <a href="mailto:contato@casozero.com.br">contato@casozero.com.br</a>
      <div><Link href="/precos">Planos</Link><Link href="/termos">Termos de uso</Link><Link href="/privacidade">Privacidade</Link></div>
    </div></footer>
  </main>;
}
