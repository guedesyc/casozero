'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarCheck, Clock3, MapPin, Monitor } from 'lucide-react';
import { PROFESSIONS } from '@/config/professions';
import { ClinicData, slugifyTopic, useClinic } from '@/services/clinic';
import { Professional } from '@/types';
import Booking from './booking';

const initialsOf = (name: string) => name.split(' ').filter(Boolean).map(x => x[0]).slice(0, 2).join('').toUpperCase();

export function Avatar({ professional, size = 48 }: { professional: Professional; size?: number }) {
  return professional.photo
    // eslint-disable-next-line @next/next/no-img-element
    ? <img className="pro-avatar" src={professional.photo} alt={professional.name} style={{ width: size, height: size }} />
    : <div className="pro-avatar" style={{ width: size, height: size, fontSize: size / 3 }}>{initialsOf(professional.name)}</div>;
}

function Modality({ professional }: { professional: Professional }) {
  if (professional.modality === 'online') return <><Monitor size={13} /> Online</>;
  if (professional.modality === 'presencial') return <><MapPin size={13} /> Presencial{professional.city ? ` em ${professional.city}` : ''}</>;
  return <><Monitor size={13} /> Online e presencial{professional.city ? ` · ${professional.city}` : ''}</>;
}

/** Cabeçalho com foto, nome, profissão e registro. */
export function ProHeader({ professional, compact = false }: { professional: Professional; compact?: boolean }) {
  const profession = PROFESSIONS[professional.profession];
  return <header className={`pro-header ${compact ? 'compact' : ''}`}>
    <Avatar professional={professional} size={compact ? 48 : 112} />
    <div><strong>{professional.name}</strong><span>{profession.title}{professional.specialties.length ? ` · ${professional.specialties.join(', ')}` : ''}</span>
      <small>{professional.councilNumber && <>{professional.councilNumber} · </>}<Modality professional={professional} /></small></div>
  </header>;
}

/** Página pública: apresentação do profissional e o convite para marcar a triagem. */
export function PublicProfile({ data }: { data: ClinicData }) {
  const p = data.professional;
  const booking = `/${p.slug}/agendar`;
  return <main className="profile-page">
    <div className={`profile-cover ${p.cover ? '' : 'empty'}`} style={p.cover ? { backgroundImage: `url(${p.cover})` } : undefined} />
    <div className="profile-wrap">
      <section className="profile-card">
        <ProHeader professional={p} />
        {p.headline && <p className="profile-headline">{p.headline}</p>}
        <Link className="primary cta" href={booking}><CalendarCheck size={18} /> Marcar consulta!</Link>
      </section>

      {p.bio && <section className="profile-section"><h2>Sobre</h2>{p.bio.split(/\n+/).map((paragraph, i) => <p key={i}>{paragraph}</p>)}</section>}

      {p.services.length > 0 && <section className="profile-section"><h2>Serviços</h2><div className="service-grid">{p.services.map(s => <article key={s.id} className="service-card">
        <h3>{s.name}</h3>{s.description && <p>{s.description}</p>}
        <footer>{s.minutes ? <span><Clock3 size={13} /> {s.minutes} min</span> : <span />}{s.price && <strong>{s.price}</strong>}</footer>
      </article>)}</div></section>}

      {p.categories.length > 0 && <section className="profile-section"><h2>Atendo pessoas que procuram ajuda com</h2><div className="chips">{p.categories.map(c => <Link key={c} className="chip" href={`${booking}/${slugifyTopic(c)}`}>{c}</Link>)}</div></section>}

      <section className="profile-section how"><h2>Como funciona</h2><ol>
        <li><b>1</b><span>Você conta rapidamente o que procura e escolhe um horário livre para a triagem, uma primeira conversa de {p.availability.triageMinutes} minutos.</span></li>
        <li><b>2</b><span>{p.name.split(' ')[0]} confirma o horário pelo seu WhatsApp.</span></li>
        <li><b>3</b><span>Depois da triagem, vocês combinam juntos o dia e o horário dos atendimentos.</span></li>
      </ol></section>

      <section className="profile-final"><h2>Vamos conversar?</h2><Link className="primary cta" href={booking}><CalendarCheck size={18} /> Marcar consulta!</Link></section>
      <footer className="profile-footer">Página criada com CasoZero</footer>
    </div>
  </main>;
}

/** /<slug> mostra a página; /<slug>/agendar[/<demanda>] abre o pedido de triagem. */
export default function PublicRoute() {
  const pathname = usePathname();
  const { data, update } = useClinic();
  const [slug, action, topic] = pathname.split('/').filter(Boolean).filter(part => part !== 'casozero');
  if (!data) return <main className="public-shell"><section className="public-card"><p>Carregando…</p></section></main>;
  if (slug !== data.professional.slug) return <main className="public-shell"><section className="public-card"><p className="eyebrow">Link não encontrado</p><h1>Não encontramos este profissional.</h1><p className="lead">Confira o endereço com quem te enviou o link.</p></section></main>;
  if (action === 'agendar') return <Booking data={data} update={update} topic={topic} />;
  return <PublicProfile data={data} />;
}
