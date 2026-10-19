-- =====================================================================
-- Duvna Academy — base de datos y reglas de seguridad (Supabase)
-- Pegá este archivo completo en Supabase > SQL Editor > Run.
-- =====================================================================

-- ---------- Tablas ----------

-- Perfil de cada alumno (se crea solo al registrarse).
create table if not exists public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  full_name   text not null default '',
  created_at  timestamptz not null default now()
);

create table if not exists public.courses (
  id      text primary key,               -- ej: 'roblox-luau'
  title   text not null,
  active  boolean not null default true
);

create table if not exists public.lessons (
  id            uuid primary key default gen_random_uuid(),
  course_id     text not null references public.courses on delete cascade,
  module_no     int  not null,
  module_title  text not null,
  position      int  not null,             -- orden dentro del módulo
  title         text not null,
  body_md       text not null default '',  -- contenido de la clase en Markdown
  video_path    text,                      -- ruta en el bucket privado "lecciones"
  is_preview    boolean not null default false, -- clase de muestra, visible sin pagar
  unique (course_id, module_no, position)
);

-- Una fila por alumno y curso. Solo el servidor (webhook de pagos) la modifica.
create table if not exists public.enrollments (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users on delete cascade,
  course_id           text not null references public.courses,
  status              text not null default 'pending'
                      check (status in ('pending','active','cancelled','refunded')),
  current_period_end  timestamptz,         -- hasta cuándo tiene acceso
  mp_preapproval_id   text unique,         -- ID de la suscripción en Mercado Pago
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (user_id, course_id)
);

create table if not exists public.progress (
  user_id       uuid not null references auth.users on delete cascade,
  lesson_id     uuid not null references public.lessons on delete cascade,
  completed_at  timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table if not exists public.certificates (
  code        text primary key,            -- ej: DUV-7F3A-91C2
  user_id     uuid references auth.users on delete set null,
  course_id   text not null references public.courses,
  full_name   text not null,
  issued_at   timestamptz not null default now(),
  unique (user_id, course_id)
);

-- Pedidos de arrepentimiento y de baja (exigidos por la normativa de consumo).
create table if not exists public.requests (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,        -- código que recibe el usuario
  type        text not null check (type in ('arrepentimiento','baja')),
  email       text not null,
  full_name   text,
  detail      text,
  user_id     uuid references auth.users on delete set null,
  status      text not null default 'recibido' check (status in ('recibido','procesado')),
  created_at  timestamptz not null default now()
);

-- ---------- Funciones ----------

-- ¿El usuario actual tiene acceso pago vigente a este curso?
-- Una suscripción cancelada conserva el acceso hasta el fin del período pagado.
create or replace function public.has_access(p_course text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from enrollments e
    where e.user_id = auth.uid()
      and e.course_id = p_course
      and e.status in ('active','cancelled')
      and e.current_period_end > now()
  );
$$;

-- Índice del curso: títulos de todas las clases (sin contenido) para mostrar el programa.
create or replace function public.course_outline(p_course text)
returns table (id uuid, module_no int, module_title text, "position" int, title text, is_preview boolean)
language sql stable security definer set search_path = public
as $$
  select l.id, l.module_no, l.module_title, l.position, l.title, l.is_preview
  from lessons l
  where l.course_id = p_course
  order by l.module_no, l.position;
$$;

-- Crea el perfil automáticamente cuando alguien se registra.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Genera un código legible y único, ej: DUV-7F3A-91C2
create or replace function public.new_code(p_prefix text)
returns text
language plpgsql volatile
as $$
declare h text := upper(replace(gen_random_uuid()::text, '-', ''));
begin
  return p_prefix || '-' || substr(h, 1, 4) || '-' || substr(h, 5, 4);
end;
$$;

-- Emite el certificado si el alumno completó todas las clases del curso.
create or replace function public.issue_certificate(p_course text)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_total  int;
  v_done   int;
  v_name   text;
  v_code   text;
begin
  if v_uid is null then raise exception 'Necesitás iniciar sesión.'; end if;

  select code into v_code from certificates where user_id = v_uid and course_id = p_course;
  if v_code is not null then return v_code; end if;

  if not exists (select 1 from enrollments where user_id = v_uid and course_id = p_course and status <> 'pending') then
    raise exception 'No tenés una inscripción en este curso.';
  end if;

  select count(*) into v_total from lessons where course_id = p_course;
  select count(*) into v_done
    from progress p join lessons l on l.id = p.lesson_id
    where p.user_id = v_uid and l.course_id = p_course;
  if v_total = 0 or v_done < v_total then
    raise exception 'Todavía te faltan % clases para terminar el curso.', v_total - v_done;
  end if;

  select full_name into v_name from profiles where id = v_uid;
  if coalesce(trim(v_name), '') = '' then
    raise exception 'Completá tu nombre en el panel antes de pedir el certificado.';
  end if;

  loop
    v_code := new_code('DUV');
    exit when not exists (select 1 from certificates where code = v_code);
  end loop;

  insert into certificates (code, user_id, course_id, full_name)
  values (v_code, v_uid, p_course, v_name);
  return v_code;
end;
$$;

-- Verificación pública de un certificado por su código (no expone otros datos).
create or replace function public.verify_certificate(p_code text)
returns table (full_name text, course_title text, issued_at timestamptz)
language sql stable security definer set search_path = public
as $$
  select c.full_name, co.title, c.issued_at
  from certificates c join courses co on co.id = c.course_id
  where c.code = upper(trim(p_code));
$$;

-- Registra un pedido de arrepentimiento o de baja y devuelve su código.
create or replace function public.submit_request(p_type text, p_email text, p_name text, p_detail text)
returns text
language plpgsql security definer set search_path = public
as $$
declare v_code text;
begin
  if p_type not in ('arrepentimiento','baja') then raise exception 'Tipo de pedido inválido.'; end if;
  if p_email is null or p_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Ingresá un email válido.'; end if;
  if length(coalesce(p_detail, '')) > 2000 then raise exception 'El detalle es demasiado largo.'; end if;

  -- Evita abusos: máximo 5 pedidos por email por día.
  if (select count(*) from requests where lower(email) = lower(p_email) and created_at > now() - interval '1 day') >= 5 then
    raise exception 'Ya recibimos varios pedidos de este email hoy. Si necesitás algo más, escribinos.';
  end if;

  loop
    v_code := new_code(case p_type when 'arrepentimiento' then 'ARR' else 'BAJ' end);
    exit when not exists (select 1 from requests where code = v_code);
  end loop;

  insert into requests (code, type, email, full_name, detail, user_id)
  values (v_code, p_type, lower(trim(p_email)), nullif(trim(p_name), ''), nullif(trim(p_detail), ''), auth.uid());
  return v_code;
end;
$$;

-- ---------- Seguridad por filas (RLS) ----------

alter table public.profiles     enable row level security;
alter table public.courses      enable row level security;
alter table public.lessons      enable row level security;
alter table public.enrollments  enable row level security;
alter table public.progress     enable row level security;
alter table public.certificates enable row level security;
alter table public.requests     enable row level security;

-- Perfil: cada uno ve y edita solo el suyo.
drop policy if exists "perfil propio: ver" on public.profiles;
create policy "perfil propio: ver" on public.profiles for select using (id = auth.uid());
drop policy if exists "perfil propio: editar" on public.profiles;
create policy "perfil propio: editar" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- Cursos: públicos.
drop policy if exists "cursos: ver" on public.courses;
create policy "cursos: ver" on public.courses for select using (true);

-- Clases: el CONTENIDO solo se entrega si es clase de muestra o si el alumno tiene acceso vigente.
drop policy if exists "clases: ver con acceso" on public.lessons;
create policy "clases: ver con acceso" on public.lessons for select
  using (is_preview or public.has_access(course_id));

-- Inscripciones: el alumno ve las suyas; nadie las escribe desde el navegador.
drop policy if exists "inscripciones: ver propias" on public.enrollments;
create policy "inscripciones: ver propias" on public.enrollments for select using (user_id = auth.uid());

-- Progreso: propio, y solo en clases a las que tiene acceso.
drop policy if exists "progreso: ver propio" on public.progress;
create policy "progreso: ver propio" on public.progress for select using (user_id = auth.uid());
drop policy if exists "progreso: marcar" on public.progress;
create policy "progreso: marcar" on public.progress for insert
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.lessons l where l.id = lesson_id and (l.is_preview or public.has_access(l.course_id)))
  );
drop policy if exists "progreso: desmarcar" on public.progress;
create policy "progreso: desmarcar" on public.progress for delete using (user_id = auth.uid());

-- Certificados: el alumno ve los suyos; la verificación pública va por verify_certificate().
drop policy if exists "certificados: ver propios" on public.certificates;
create policy "certificados: ver propios" on public.certificates for select using (user_id = auth.uid());

-- Pedidos: sin acceso directo desde el navegador (solo por submit_request()).

-- Permisos de ejecución de funciones.
revoke all on function public.issue_certificate(text) from public, anon;
grant execute on function public.issue_certificate(text) to authenticated;
grant execute on function public.verify_certificate(text) to anon, authenticated;
grant execute on function public.course_outline(text) to anon, authenticated;
grant execute on function public.submit_request(text, text, text, text) to anon, authenticated;
grant execute on function public.has_access(text) to anon, authenticated;
revoke all on function public.new_code(text) from public, anon, authenticated;

-- ---------- Videos privados ----------
-- Bucket privado. Ruta de cada video: <id-del-curso>/<archivo>, ej: roblox-luau/m01-c01.mp4
insert into storage.buckets (id, name, public)
values ('lecciones', 'lecciones', false)
on conflict (id) do nothing;

drop policy if exists "videos: ver con acceso" on storage.objects;
create policy "videos: ver con acceso" on storage.objects for select
  using (
    bucket_id = 'lecciones'
    and (
      public.has_access((storage.foldername(name))[1])
      or exists (select 1 from public.lessons l where l.video_path = name and l.is_preview)
    )
  );
