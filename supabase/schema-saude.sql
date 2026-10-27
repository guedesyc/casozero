-- =====================================================================
-- CasoZero Saúde — esquema do banco (projeto Supabase "Caso Zero",
-- ref rlxaninumfevbectpbub). Rodar no SQL Editor. Idempotente.
--
-- Regras de acesso:
--   * Cada profissional só lê e escreve os próprios dados (RLS por auth.uid()).
--   * O visitante anônimo NÃO acessa tabelas. A página pública usa apenas as
--     funções get_public_profile, get_busy_slots e submit_triage_request,
--     que devolvem só o necessário (sem nomes de pacientes) e validam tudo.
--   * Grants explícitos em todas as tabelas (exigência do Supabase a partir
--     de 30/10/2026 para tabelas novas no schema public).
--   * Caderneta e pacientes não podem ser apagados (guarda do prontuário).
-- =====================================================================

create extension if not exists btree_gist with schema extensions;

-- ---------------------------------------------------------------------
-- 1. Sobras do CasoZero jurídico (sem clientes, autorizado remover)
-- ---------------------------------------------------------------------
drop table if exists public.case_messages cascade;
drop table if exists public.case_timeline cascade;
drop table if exists public.cases cascade;
drop table if exists public.profiles cascade;
drop table if exists public.law_firms cascade;
drop function if exists public.user_law_firm_id() cascade;

-- ---------------------------------------------------------------------
-- 2. Funções auxiliares
-- ---------------------------------------------------------------------
create or replace function public.is_reserved_slug(p_slug text)
returns boolean language sql immutable set search_path = '' as $$
  select p_slug = any (array[
    'app','api','admin','login','logout','entrar','sair','cadastro','cadastrar','precos','planos',
    'esqueci-senha','redefinir-senha','senha','conta','configuracoes','ajuda','suporte','contato',
    'termos','privacidade','sobre','blog','static','public','assets','casozero','www','_next',
    'agendar','pagina','perfil','equipe','pacientes','agenda','solicitacoes','disponibilidade','meu-link'
  ]);
$$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;

-- ---------------------------------------------------------------------
-- 3. Tabelas
-- ---------------------------------------------------------------------
create table if not exists public.professionals (
  id             uuid primary key references auth.users (id) on delete cascade,
  slug           text not null unique
                 check (slug ~ '^[a-z0-9]{3,40}$' and not public.is_reserved_slug(slug)),
  name           text not null check (char_length(name) between 2 and 120),
  email          text check (email is null or char_length(email) <= 254),
  phone          text check (phone is null or char_length(phone) <= 30),
  profession     text not null check (profession in ('psicologia','psicanalise','fisioterapia','fonoaudiologia','nutricao','terapia_ocupacional','psicopedagogia','terapias_integrativas')),
  council_number text check (council_number is null or char_length(council_number) <= 40),
  specialties    text[] not null default '{}' check (cardinality(specialties) <= 30),
  categories     text[] not null default '{}' check (cardinality(categories) <= 40),
  modality       text not null default 'ambos' check (modality in ('online','presencial','ambos')),
  city           text check (city is null or char_length(city) <= 80),
  headline       text check (headline is null or char_length(headline) <= 200),
  bio            text check (bio is null or char_length(bio) <= 5000),
  -- Só imagens do próprio armazenamento do CasoZero.
  photo_url      text check (photo_url is null or photo_url like 'https://rlxaninumfevbectpbub.supabase.co/storage/v1/object/public/perfis/%'),
  cover_url      text check (cover_url is null or cover_url like 'https://rlxaninumfevbectpbub.supabase.co/storage/v1/object/public/perfis/%'),
  services       jsonb not null default '[]' check (jsonb_typeof(services) = 'array' and jsonb_array_length(services) <= 30),
  booking_title  text not null default 'O que você procura?' check (char_length(booking_title) <= 120),
  booking_intro  text not null default '' check (char_length(booking_intro) <= 1000),
  -- windows, triageMinutes, sessionMinutes, minNoticeHours, horizonDays, blocks
  availability   jsonb not null check (jsonb_typeof(availability) = 'object'),
  -- preferências da conta, equipe, aviso de boas-vindas visto
  settings       jsonb not null default '{}' check (jsonb_typeof(settings) = 'object'),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table if not exists public.triage_requests (
  id              uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals (id) on delete cascade,
  name            text not null check (char_length(name) between 2 and 120),
  age             smallint check (age between 0 and 120),
  phone           text not null check (char_length(regexp_replace(phone, '\D', '', 'g')) between 10 and 13),
  guardian_name   text check (guardian_name is null or char_length(guardian_name) <= 120),
  category        text not null check (char_length(category) between 1 and 80),
  service         text check (service is null or char_length(service) <= 120),
  concern         text not null default '' check (char_length(concern) <= 2000),
  expectation     text not null default '' check (char_length(expectation) <= 2000),
  modality        text check (modality in ('online','presencial')),
  requested_date  date not null,
  requested_time  time not null,
  scheduled_date  date,
  scheduled_time  time,
  status          text not null default 'pending' check (status in ('pending','proposed','awaiting_payment','confirmed','declined','continued','not_continued')),
  decline_reason  text check (decline_reason is null or char_length(decline_reason) <= 1000),
  outcome_note    text check (outcome_note is null or char_length(outcome_note) <= 5000),
  patient_id      uuid,
  consent_at      timestamptz,
  track_token     text unique,
  payment_reported_at timestamptz,
  paid_at         timestamptz,
  proposed_date   date,
  proposed_time   time,
  proposal_note   text,
  created_at      timestamptz not null default now(),
  unique (professional_id, id)
);
create index if not exists triage_requests_owner_idx on public.triage_requests (professional_id, status, requested_date);

create table if not exists public.patients (
  id              uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals (id) on delete cascade,
  request_id      uuid,
  name            text not null check (char_length(name) between 2 and 120),
  age             smallint check (age between 0 and 120),
  phone           text not null check (char_length(phone) <= 30),
  guardian_name   text check (guardian_name is null or char_length(guardian_name) <= 120),
  category        text not null default '' check (char_length(category) <= 80),
  concern         text not null default '' check (char_length(concern) <= 2000),
  expectation     text not null default '' check (char_length(expectation) <= 2000),
  status          text not null default 'active' check (status in ('active','paused','discharged')),
  recurrence      jsonb check (recurrence is null or jsonb_typeof(recurrence) = 'object'),
  created_at      timestamptz not null default now(),
  unique (professional_id, id),
  foreign key (professional_id, request_id) references public.triage_requests (professional_id, id)
);
create index if not exists patients_owner_idx on public.patients (professional_id, status);

create table if not exists public.appointments (
  id              uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals (id) on delete cascade,
  kind            text not null check (kind in ('triage','session')),
  date            date not null,
  time            time not null,
  minutes         smallint not null check (minutes between 10 and 240),
  status          text not null default 'scheduled' check (status in ('scheduled','done','missed','canceled')),
  request_id      uuid,
  patient_id      uuid,
  title           text not null default '' check (char_length(title) <= 120),
  starts_at       timestamp generated always as (date + time) stored,
  ends_at         timestamp generated always as (date + time + minutes * interval '1 minute') stored,
  unique (professional_id, id),
  foreign key (professional_id, request_id) references public.triage_requests (professional_id, id),
  foreign key (professional_id, patient_id) references public.patients (professional_id, id),
  -- Garantia final contra dois atendimentos sobrepostos da mesma profissional.
  constraint appointments_no_overlap exclude using gist (
    professional_id with =, tsrange(starts_at, ends_at) with &&
  ) where (status <> 'canceled')
);
create index if not exists appointments_owner_idx on public.appointments (professional_id, date);

create table if not exists public.session_notes (
  id              uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals (id) on delete cascade,
  patient_id      uuid not null,
  appointment_id  uuid unique,
  number          smallint not null check (number >= 0),
  date            date not null,
  notes           text not null default '' check (char_length(notes) <= 20000),
  evolution       text not null default '' check (char_length(evolution) <= 1000),
  updated_at      timestamptz not null default now(),
  foreign key (professional_id, patient_id) references public.patients (professional_id, id),
  foreign key (professional_id, appointment_id) references public.appointments (professional_id, id)
);
create index if not exists session_notes_owner_idx on public.session_notes (professional_id, patient_id);

drop trigger if exists professionals_touch on public.professionals;
create trigger professionals_touch before update on public.professionals for each row execute function public.touch_updated_at();
drop trigger if exists session_notes_touch on public.session_notes;
create trigger session_notes_touch before update on public.session_notes for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- 4. Limite do plano Grátis: 5 pacientes no total (alta não libera vaga)
-- ---------------------------------------------------------------------
create or replace function public.enforce_patient_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare paid boolean;
begin
  select exists (
    select 1 from public.subscriptions s
    where s.user_id = new.professional_id and s.status = 'active'
      and s.plan_id in ('profissional','clinica','caso_um','caso_dois','caso_tres')
  ) into paid;
  if not paid and (select count(*) from public.patients p where p.professional_id = new.professional_id) >= 5 then
    raise exception 'LIMITE_PLANO_GRATIS' using errcode = 'P0001';
  end if;
  return new;
end $$;
drop trigger if exists patients_limit on public.patients;
create trigger patients_limit before insert on public.patients for each row execute function public.enforce_patient_limit();

-- ---------------------------------------------------------------------
-- 5. RLS: cada profissional só enxerga o que é seu
-- ---------------------------------------------------------------------
alter table public.professionals   enable row level security;
alter table public.triage_requests enable row level security;
alter table public.patients        enable row level security;
alter table public.appointments    enable row level security;
alter table public.session_notes   enable row level security;

drop policy if exists professionals_own on public.professionals;
create policy professionals_own on public.professionals for all to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists requests_own on public.triage_requests;
create policy requests_own on public.triage_requests for all to authenticated
  using (professional_id = (select auth.uid())) with check (professional_id = (select auth.uid()));

drop policy if exists patients_own on public.patients;
create policy patients_own on public.patients for all to authenticated
  using (professional_id = (select auth.uid())) with check (professional_id = (select auth.uid()));

drop policy if exists appointments_own on public.appointments;
create policy appointments_own on public.appointments for all to authenticated
  using (professional_id = (select auth.uid())) with check (professional_id = (select auth.uid()));

drop policy if exists notes_own on public.session_notes;
create policy notes_own on public.session_notes for all to authenticated
  using (professional_id = (select auth.uid())) with check (professional_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- 6. Grants explícitos. anon: nenhum acesso direto a tabelas.
--    Pacientes, pedidos e caderneta não têm DELETE (guarda do prontuário).
-- ---------------------------------------------------------------------
revoke all on public.professionals, public.triage_requests, public.patients, public.appointments, public.session_notes from anon, authenticated;
grant select, insert, update          on public.professionals   to authenticated;
grant select, insert, update          on public.triage_requests to authenticated;
grant select, insert, update          on public.patients        to authenticated;
grant select, insert, update, delete  on public.appointments    to authenticated;
grant select, insert, update          on public.session_notes   to authenticated;
grant all on public.professionals, public.triage_requests, public.patients, public.appointments, public.session_notes to service_role;

-- Assinaturas: só o webhook (service_role) escreve; o usuário só lê a própria.
revoke all on public.subscriptions from anon, authenticated;
grant select on public.subscriptions to authenticated;
grant all on public.subscriptions to service_role;
drop policy if exists "users can read own subscription" on public.subscriptions;
drop policy if exists subscriptions_read_own on public.subscriptions;
create policy subscriptions_read_own on public.subscriptions for select to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- 7. Funções da página pública (únicas portas de entrada do anônimo)
-- ---------------------------------------------------------------------

-- Perfil público: só campos de vitrine. Sem e-mail, telefone ou motivos de bloqueio.
create or replace function public.get_public_profile(p_slug text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'slug', p.slug, 'name', p.name, 'profession', p.profession, 'councilNumber', p.council_number,
    'specialties', p.specialties, 'categories', p.categories, 'modality', p.modality, 'city', p.city,
    'headline', p.headline, 'bio', p.bio, 'photo', p.photo_url, 'cover', p.cover_url,
    'services', p.services, 'bookingTitle', p.booking_title, 'bookingIntro', p.booking_intro,
    'availability', jsonb_build_object(
      'windows', p.availability -> 'windows',
      'triageMinutes', p.availability -> 'triageMinutes',
      'sessionMinutes', p.availability -> 'sessionMinutes',
      'minNoticeHours', p.availability -> 'minNoticeHours',
      'horizonDays', p.availability -> 'horizonDays',
      'blocks', coalesce((select jsonb_agg(jsonb_build_object('id', b ->> 'id', 'date', b ->> 'date', 'allDay', (b ->> 'allDay')::boolean, 'start', b ->> 'start', 'end', b ->> 'end'))
                          from jsonb_array_elements(coalesce(p.availability -> 'blocks', '[]')) b
                          where (b ->> 'date')::date >= (now() at time zone 'America/Sao_Paulo')::date), '[]'::jsonb)
    )
  )
  from public.professionals p where p.slug = lower(p_slug);
$$;

-- Horários ocupados (sem nomes): compromissos e pedidos pendentes.
create or replace function public.get_busy_slots(p_slug text, p_from date, p_to date)
returns table (date date, "time" time, minutes smallint)
language sql stable security definer set search_path = '' as $$
  with pro as (select id, (availability ->> 'triageMinutes')::smallint as triage from public.professionals where slug = lower(p_slug))
  select a.date, a.time, a.minutes from public.appointments a, pro
   where a.professional_id = pro.id and a.status <> 'canceled'
     and a.date between p_from and least(p_to, p_from + 62)
  union all
  select r.requested_date, r.requested_time, pro.triage from public.triage_requests r, pro
   where r.professional_id = pro.id and r.status = 'pending'
     and r.requested_date between p_from and least(p_to, p_from + 62);
$$;

-- Pedido de triagem com todas as validações no servidor.
drop function if exists public.submit_triage_request(text, text, int, text, text, text, text, text, text, date, time, text);
create or replace function public.submit_triage_request(
  p_slug text, p_name text, p_age int, p_phone text, p_guardian_name text, p_category text,
  p_concern text, p_expectation text, p_modality text, p_date date, p_time time, p_service text default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  pro public.professionals%rowtype;
  win jsonb;
  triage int;
  local_now timestamp := now() at time zone 'America/Sao_Paulo';
  slot_start timestamp := p_date + p_time;
  slot_end timestamp;
  digits text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  new_id uuid;
  new_token text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
begin
  select * into pro from public.professionals where slug = lower(p_slug);
  if not found then raise exception 'PROFISSIONAL_NAO_ENCONTRADO' using errcode = 'P0001'; end if;
  perform pg_advisory_xact_lock(hashtext(pro.id::text));

  triage := coalesce((pro.availability ->> 'triageMinutes')::int, 30);
  slot_end := slot_start + triage * interval '1 minute';

  if char_length(trim(coalesce(p_name, ''))) < 2 then raise exception 'NOME_INVALIDO' using errcode = 'P0001'; end if;
  if char_length(digits) not between 10 and 13 then raise exception 'TELEFONE_INVALIDO' using errcode = 'P0001'; end if;
  if p_age is not null and p_age < 18 and char_length(trim(coalesce(p_guardian_name, ''))) < 2 then raise exception 'RESPONSAVEL_OBRIGATORIO' using errcode = 'P0001'; end if;

  if slot_start < local_now + coalesce((pro.availability ->> 'minNoticeHours')::int, 12) * interval '1 hour'
     or p_date > local_now::date + coalesce((pro.availability ->> 'horizonDays')::int, 30) then
    raise exception 'HORARIO_INDISPONIVEL' using errcode = 'P0001';
  end if;

  select w into win from jsonb_array_elements(pro.availability -> 'windows') w
   where (w ->> 'weekday')::int = extract(dow from p_date)::int and (w ->> 'enabled')::boolean;
  if win is null or p_time < (win ->> 'start')::time or (p_time + triage * interval '1 minute') > (win ->> 'end')::time
     or (p_time + triage * interval '1 minute') <= p_time
     or (extract(epoch from (p_time - (win ->> 'start')::time)) / 60)::int % triage <> 0 then
    raise exception 'HORARIO_INDISPONIVEL' using errcode = 'P0001';
  end if;

  if exists (select 1 from jsonb_array_elements(coalesce(pro.availability -> 'blocks', '[]')) b
             where (b ->> 'date')::date = p_date
               and ((b ->> 'allDay')::boolean or ((b ->> 'start')::time < (p_time + triage * interval '1 minute') and p_time < (b ->> 'end')::time))) then
    raise exception 'HORARIO_INDISPONIVEL' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.appointments a where a.professional_id = pro.id and a.status <> 'canceled'
               and a.starts_at < slot_end and slot_start < a.ends_at)
     or exists (select 1 from public.triage_requests r where r.professional_id = pro.id and r.status = 'pending'
               and r.requested_date = p_date
               and r.requested_time < (p_time + triage * interval '1 minute') and p_time < (r.requested_time + triage * interval '1 minute')) then
    raise exception 'HORARIO_OCUPADO' using errcode = 'P0001';
  end if;

  if (select count(*) from public.triage_requests r where r.professional_id = pro.id and r.status = 'pending'
        and regexp_replace(r.phone, '\D', '', 'g') = digits) >= 2
     or (select count(*) from public.triage_requests r where r.professional_id = pro.id and r.status = 'pending') >= 100 then
    raise exception 'MUITOS_PEDIDOS' using errcode = 'P0001';
  end if;

  insert into public.triage_requests (professional_id, name, age, phone, guardian_name, category, service, concern, expectation, modality, requested_date, requested_time, consent_at, track_token)
  values (pro.id, trim(p_name), p_age, trim(p_phone), nullif(trim(coalesce(p_guardian_name, '')), ''), left(coalesce(nullif(trim(p_category), ''), 'Outro assunto'), 80),
          nullif(left(trim(coalesce(p_service, '')), 120), ''),
          left(coalesce(p_concern, ''), 2000), left(coalesce(p_expectation, ''), 2000),
          case when p_modality in ('online','presencial') then p_modality end, p_date, p_time, now(), new_token)
  returning id into new_id;
  return jsonb_build_object('id', new_id, 'trackToken', new_token);
end $$;

-- Dono da solicitação pede o código de acompanhamento (cria se ainda não existir).
create or replace function public.ensure_tracking_token(p_request_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare t text;
begin
  select r.track_token into t from public.triage_requests r
   where r.id = p_request_id and r.professional_id = (select auth.uid());
  if not found then raise exception 'NAO_ENCONTRADO' using errcode = 'P0001'; end if;
  if t is null then
    t := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
    update public.triage_requests set track_token = t where id = p_request_id;
  end if;
  return t;
end $$;

-- Paciente abre o link: só o necessário para acompanhar (sem dados de outros pacientes).
create or replace function public.get_request_by_token(p_token text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'status', r.status,
    'name', split_part(r.name, ' ', 1),
    'service', r.service,
    'category', r.category,
    'requestedDate', r.requested_date,
    'requestedTime', to_char(r.requested_time, 'HH24:MI'),
    'scheduledDate', r.scheduled_date,
    'scheduledTime', to_char(r.scheduled_time, 'HH24:MI'),
    'proposedDate', r.proposed_date,
    'proposedTime', to_char(r.proposed_time, 'HH24:MI'),
    'paymentReportedAt', r.payment_reported_at,
    'professional', p.name,
    'slug', p.slug,
    'pixKey', nullif(p.settings -> 'account' ->> 'pixKey', ''),
    'pixHolder', nullif(p.settings -> 'account' ->> 'pixHolder', ''),
    'signalAmount', nullif(p.settings -> 'account' ->> 'signalAmount', ''),
    'contactPhone', nullif(p.phone, '')
  )
  from public.triage_requests r join public.professionals p on p.id = r.professional_id
  where r.track_token = p_token and char_length(p_token) between 40 and 80;
$$;

revoke all on function public.submit_triage_request(text, text, int, text, text, text, text, text, text, date, time, text),
  public.ensure_tracking_token(uuid), public.get_request_by_token(text), public.report_payment(text), public.respond_proposal(text, date, time) from public, anon, authenticated;
grant execute on function public.submit_triage_request(text, text, int, text, text, text, text, text, text, date, time, text) to anon, authenticated;
grant execute on function public.ensure_tracking_token(uuid) to authenticated;
grant execute on function public.get_request_by_token(text) to anon, authenticated;
grant execute on function public.report_payment(text) to anon, authenticated;
grant execute on function public.respond_proposal(text, date, time) to anon, authenticated;


-- Paciente marca "já paguei" pelo link. Só altera a data do aviso, nada mais.
create or replace function public.report_payment(p_token text)
returns boolean language sql security definer set search_path = '' as $$
  with u as (
    update public.triage_requests set payment_reported_at = coalesce(payment_reported_at, now())
     where track_token = p_token and char_length(p_token) between 40 and 80 and status = 'awaiting_payment'
    returning 1
  )
  select exists (select 1 from u);
$$;

-- Paciente aceita o horário sugerido ou escolhe outro dia no calendário.
create or replace function public.respond_proposal(p_token text, p_date date default null, p_time time default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  r public.triage_requests%rowtype;
  pro public.professionals%rowtype;
  win jsonb;
  triage int;
  local_now timestamp := now() at time zone 'America/Sao_Paulo';
  d date; t time; slot_start timestamp; slot_end timestamp;
  new_status text;
begin
  select * into r from public.triage_requests
   where track_token = p_token and char_length(p_token) between 40 and 80 for update;
  if not found or r.status <> 'proposed' then raise exception 'SEM_PROPOSTA' using errcode = 'P0001'; end if;
  select * into pro from public.professionals where id = r.professional_id;
  perform pg_advisory_xact_lock(hashtext(pro.id::text));

  d := coalesce(p_date, r.proposed_date);
  t := coalesce(p_time, r.proposed_time);
  triage := coalesce((pro.availability ->> 'triageMinutes')::int, 30);
  slot_start := d + t;
  slot_end := slot_start + triage * interval '1 minute';

  if slot_start < local_now + coalesce((pro.availability ->> 'minNoticeHours')::int, 12) * interval '1 hour'
     or d > local_now::date + coalesce((pro.availability ->> 'horizonDays')::int, 30) then
    raise exception 'HORARIO_INDISPONIVEL' using errcode = 'P0001';
  end if;
  select w into win from jsonb_array_elements(pro.availability -> 'windows') w
   where (w ->> 'weekday')::int = extract(dow from d)::int and (w ->> 'enabled')::boolean;
  if win is null or t < (win ->> 'start')::time or (t + triage * interval '1 minute') > (win ->> 'end')::time
     or (extract(epoch from (t - (win ->> 'start')::time)) / 60)::int % triage <> 0 then
    raise exception 'HORARIO_INDISPONIVEL' using errcode = 'P0001';
  end if;
  if exists (select 1 from jsonb_array_elements(coalesce(pro.availability -> 'blocks', '[]')) b
             where (b ->> 'date')::date = d
               and ((b ->> 'allDay')::boolean or ((b ->> 'start')::time < (t + triage * interval '1 minute') and t < (b ->> 'end')::time))) then
    raise exception 'HORARIO_INDISPONIVEL' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.appointments a where a.professional_id = pro.id and a.status <> 'canceled'
               and a.starts_at < slot_end and slot_start < a.ends_at)
     or exists (select 1 from public.triage_requests o where o.professional_id = pro.id and o.status = 'pending'
               and o.id <> r.id and o.requested_date = d
               and o.requested_time < (t + triage * interval '1 minute') and t < (o.requested_time + triage * interval '1 minute')) then
    raise exception 'HORARIO_OCUPADO' using errcode = 'P0001';
  end if;

  -- Com chave PIX, a vaga só fica firmada depois do sinal.
  new_status := case when coalesce(pro.settings -> 'account' ->> 'pixKey', '') <> '' then 'awaiting_payment' else 'confirmed' end;
  update public.triage_requests
     set scheduled_date = d, scheduled_time = t, proposed_date = null, proposed_time = null, proposal_note = null, status = new_status
   where id = r.id;
  insert into public.appointments (professional_id, kind, date, time, minutes, status, request_id, title)
  values (pro.id, 'triage', d, t, triage, 'scheduled', r.id, r.name);
  return jsonb_build_object('status', new_status, 'date', d, 'time', to_char(t, 'HH24:MI'));
end $$;

-- Endereço livre para o link (para o cadastro e a troca em "Meu link").
create or replace function public.slug_available(p_slug text)
returns boolean language sql stable security definer set search_path = '' as $$
  select lower(p_slug) ~ '^[a-z0-9]{3,40}$' and not public.is_reserved_slug(lower(p_slug))
     and not exists (select 1 from public.professionals p where p.slug = lower(p_slug) and p.id <> (select auth.uid()));
$$;

revoke all on function public.get_public_profile(text), public.get_busy_slots(text, date, date),
  public.submit_triage_request(text, text, int, text, text, text, text, text, text, date, time, text),
  public.slug_available(text), public.enforce_patient_limit(), public.is_reserved_slug(text), public.touch_updated_at(),
  public.ensure_tracking_token(uuid), public.get_request_by_token(text), public.report_payment(text), public.respond_proposal(text, date, time) from public, anon, authenticated;
grant execute on function public.get_public_profile(text) to anon, authenticated;
grant execute on function public.get_busy_slots(text, date, date) to anon, authenticated;
grant execute on function public.submit_triage_request(text, text, int, text, text, text, text, text, text, date, time, text) to anon, authenticated;
grant execute on function public.slug_available(text) to authenticated;
grant execute on function public.ensure_tracking_token(uuid) to authenticated;
grant execute on function public.get_request_by_token(text) to anon, authenticated;
grant execute on function public.report_payment(text) to anon, authenticated;
grant execute on function public.respond_proposal(text, date, time) to anon, authenticated;
grant execute on function public.is_reserved_slug(text) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- 8. Armazenamento de foto e capa (leitura pública, escrita só na própria pasta)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('perfis', 'perfis', true, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 2097152, allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists perfis_select_own on storage.objects;
drop policy if exists perfis_insert_own on storage.objects;
drop policy if exists perfis_update_own on storage.objects;
drop policy if exists perfis_delete_own on storage.objects;
-- Listar/apagar exige ler a própria pasta; a leitura pública da foto é pelo link público do bucket.
create policy perfis_select_own on storage.objects for select to authenticated
  using (bucket_id = 'perfis' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy perfis_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'perfis' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy perfis_update_own on storage.objects for update to authenticated
  using (bucket_id = 'perfis' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy perfis_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'perfis' and (storage.foldername(name))[1] = (select auth.uid())::text);
