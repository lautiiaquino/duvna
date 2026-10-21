-- =====================================================================
-- Duvna Academy: base de datos completa (Supabase)
-- Pegá TODO este archivo en Supabase > SQL Editor > New query > Run.
-- Se puede correr más de una vez sin romper nada.
-- =====================================================================

-- ---------- Tablas ----------

create table if not exists public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  full_name   text not null default '',
  email       text not null default '',
  is_admin    boolean not null default false,
  created_at  timestamptz not null default now()
);

create table if not exists public.courses (
  id      text primary key,
  title   text not null,
  active  boolean not null default true
);

create table if not exists public.lessons (
  id            uuid primary key default gen_random_uuid(),
  course_id     text not null references public.courses on delete cascade,
  module_no     int  not null,
  module_title  text not null,
  position      int  not null,
  title         text not null,
  body_html     text not null default '',
  is_preview    boolean not null default false,
  unique (course_id, module_no, position)
);

-- Inscripciones: solo el administrador las crea o cambia.
create table if not exists public.enrollments (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users on delete cascade,
  course_id           text not null references public.courses,
  status              text not null default 'active' check (status in ('active','cancelled')),
  current_period_end  timestamptz not null,
  note                text,
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
  code        text primary key,
  user_id     uuid references auth.users on delete set null,
  course_id   text not null references public.courses,
  full_name   text not null,
  issued_at   timestamptz not null default now(),
  unique (user_id, course_id)
);

-- Pedidos de inscripción, arrepentimiento y baja.
create table if not exists public.requests (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  type        text not null check (type in ('inscripcion','arrepentimiento','baja')),
  email       text not null,
  full_name   text,
  detail      text,
  user_id     uuid references auth.users on delete set null,
  status      text not null default 'recibido' check (status in ('recibido','procesado')),
  created_at  timestamptz not null default now()
);

-- ---------- Funciones ----------

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false);
$$;

create or replace function public.has_access(p_course text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (
    select 1 from enrollments e
    where e.user_id = auth.uid() and e.course_id = p_course and e.current_period_end > now()
  );
$$;

-- Programa del curso (títulos, sin contenido): público.
create or replace function public.course_outline(p_course text)
returns table (id uuid, module_no int, module_title text, "position" int, title text, is_preview boolean)
language sql stable security definer set search_path = public as $$
  select l.id, l.module_no, l.module_title, l.position, l.title, l.is_preview
  from lessons l where l.course_id = p_course order by l.module_no, l.position;
$$;

-- Perfil automático al registrarse.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name, email)
  values (new.id, coalesce(nullif(new.raw_user_meta_data->>'full_name', ''), new.raw_user_meta_data->>'name', ''), coalesce(new.email, ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- Que nadie pueda hacerse administrador desde el navegador.
create or replace function public.protect_profile()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Desde el navegador (con sesión) solo un admin puede cambiar estos campos.
  -- Desde el SQL Editor de Supabase no hay sesión y se permite.
  if auth.uid() is not null and not public.is_admin() then
    new.is_admin := old.is_admin;
    new.email := old.email;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect on public.profiles;
create trigger profiles_protect before update on public.profiles
  for each row execute function public.protect_profile();

create or replace function public.new_code(p_prefix text)
returns text language plpgsql volatile as $$
declare
  letras constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  r text := '';
begin
  for i in 1..8 loop
    r := r || substr(letras, 1 + floor(random() * length(letras))::int, 1);
  end loop;
  return p_prefix || '-' || substr(r, 1, 4) || '-' || substr(r, 5, 4);
end;
$$;

create or replace function public.issue_certificate(p_course text)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_total int; v_done int; v_name text; v_code text;
begin
  if v_uid is null then raise exception 'Necesitás iniciar sesión.'; end if;

  select code into v_code from certificates where user_id = v_uid and course_id = p_course;
  if v_code is not null then return v_code; end if;

  if not public.has_access(p_course) then raise exception 'No tenés acceso a este curso.'; end if;

  select count(*) into v_total from lessons where course_id = p_course;
  select count(*) into v_done from progress p join lessons l on l.id = p.lesson_id
    where p.user_id = v_uid and l.course_id = p_course;
  if v_total = 0 or v_done < v_total then
    raise exception 'Te faltan % clases para terminar el curso.', v_total - v_done;
  end if;

  select full_name into v_name from profiles where id = v_uid;
  if coalesce(trim(v_name), '') = '' then raise exception 'Completá tu nombre antes de pedir el certificado.'; end if;

  loop
    v_code := new_code('DUV');
    exit when not exists (select 1 from certificates where code = v_code);
  end loop;
  insert into certificates (code, user_id, course_id, full_name) values (v_code, v_uid, p_course, v_name);
  return v_code;
end;
$$;

create or replace function public.verify_certificate(p_code text)
returns table (full_name text, course_title text, issued_at timestamptz)
language sql stable security definer set search_path = public as $$
  select c.full_name, co.title, c.issued_at from certificates c join courses co on co.id = c.course_id
  where c.code = upper(trim(p_code));
$$;

create or replace function public.submit_request(p_type text, p_email text, p_name text, p_detail text)
returns text language plpgsql security definer set search_path = public as $$
declare v_code text;
begin
  if p_type not in ('inscripcion','arrepentimiento','baja') then raise exception 'Tipo de pedido inválido.'; end if;
  if p_email is null or p_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Ingresá un email válido.'; end if;
  if length(coalesce(p_detail, '')) > 2000 or length(coalesce(p_name, '')) > 120 then raise exception 'El texto es demasiado largo.'; end if;
  if (select count(*) from requests where lower(email) = lower(p_email) and created_at > now() - interval '1 day') >= 5 then
    raise exception 'Ya recibimos varios pedidos de este email hoy. Si necesitás algo más, escribinos.';
  end if;
  loop
    v_code := new_code(case p_type when 'arrepentimiento' then 'ARR' when 'baja' then 'BAJ' else 'INS' end);
    exit when not exists (select 1 from requests where code = v_code);
  end loop;
  insert into requests (code, type, email, full_name, detail, user_id)
  values (v_code, p_type, lower(trim(p_email)), nullif(trim(p_name), ''), nullif(trim(p_detail), ''), auth.uid());
  return v_code;
end;
$$;

-- ---------- Funciones del administrador ----------

-- Dar o extender acceso por email. p_days = días desde hoy (o desde el vencimiento actual si todavía está vigente).
create or replace function public.admin_grant_access(p_email text, p_course text, p_days int, p_note text default null)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare v_uid uuid; v_end timestamptz;
begin
  if not public.is_admin() then raise exception 'Solo el administrador puede hacer esto.'; end if;
  select id into v_uid from profiles where lower(email) = lower(trim(p_email));
  if v_uid is null then raise exception 'No hay ninguna cuenta con el email %. El alumno tiene que registrarse primero.', p_email; end if;
  select greatest(coalesce(max(current_period_end), now()), now()) + make_interval(days => p_days) into v_end
    from enrollments where user_id = v_uid and course_id = p_course;
  insert into enrollments (user_id, course_id, status, current_period_end, note)
  values (v_uid, p_course, 'active', v_end, p_note)
  on conflict (user_id, course_id) do update
    set status = 'active', current_period_end = excluded.current_period_end,
        note = coalesce(excluded.note, enrollments.note), updated_at = now();
  return v_end;
end;
$$;

-- Quitar acceso. p_now = true lo corta ya (arrepentimiento); false lo deja hasta el fin del período pagado (baja).
create or replace function public.admin_revoke_access(p_user uuid, p_course text, p_now boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Solo el administrador puede hacer esto.'; end if;
  update enrollments set status = 'cancelled',
    current_period_end = case when p_now then now() else current_period_end end, updated_at = now()
  where user_id = p_user and course_id = p_course;
end;
$$;

-- Cargar o actualizar una clase (lo usa el importador del panel).
create or replace function public.admin_upsert_lesson(p_course text, p_module int, p_module_title text, p_position int,
  p_title text, p_body text, p_preview boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Solo el administrador puede hacer esto.'; end if;
  insert into lessons (course_id, module_no, module_title, position, title, body_html, is_preview)
  values (p_course, p_module, p_module_title, p_position, p_title, p_body, p_preview)
  on conflict (course_id, module_no, position) do update
    set module_title = excluded.module_title, title = excluded.title,
        body_html = excluded.body_html, is_preview = excluded.is_preview;
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

drop policy if exists "perfil: ver" on public.profiles;
create policy "perfil: ver" on public.profiles for select using (id = auth.uid() or public.is_admin());
drop policy if exists "perfil: editar" on public.profiles;
create policy "perfil: editar" on public.profiles for update using (id = auth.uid() or public.is_admin());

drop policy if exists "cursos: ver" on public.courses;
create policy "cursos: ver" on public.courses for select using (true);

-- El contenido de una clase solo sale si es de muestra o si hay acceso vigente.
drop policy if exists "clases: ver" on public.lessons;
create policy "clases: ver" on public.lessons for select using (is_preview or public.has_access(course_id));

drop policy if exists "inscripciones: ver" on public.enrollments;
create policy "inscripciones: ver" on public.enrollments for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "progreso: ver" on public.progress;
create policy "progreso: ver" on public.progress for select using (user_id = auth.uid());
drop policy if exists "progreso: marcar" on public.progress;
create policy "progreso: marcar" on public.progress for insert with check (
  user_id = auth.uid() and exists (
    select 1 from public.lessons l where l.id = lesson_id and (l.is_preview or public.has_access(l.course_id))));
drop policy if exists "progreso: desmarcar" on public.progress;
create policy "progreso: desmarcar" on public.progress for delete using (user_id = auth.uid());

drop policy if exists "certificados: ver" on public.certificates;
create policy "certificados: ver" on public.certificates for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "pedidos: ver" on public.requests;
create policy "pedidos: ver" on public.requests for select using (public.is_admin() or user_id = auth.uid());
drop policy if exists "pedidos: actualizar" on public.requests;
create policy "pedidos: actualizar" on public.requests for update using (public.is_admin());

-- ---------- Permisos de funciones ----------
revoke all on function public.new_code(text) from public, anon, authenticated;
revoke all on function public.issue_certificate(text) from public, anon;
grant execute on function public.issue_certificate(text) to authenticated;
grant execute on function public.verify_certificate(text) to anon, authenticated;
grant execute on function public.course_outline(text) to anon, authenticated;
grant execute on function public.submit_request(text, text, text, text) to anon, authenticated;
grant execute on function public.has_access(text) to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;
revoke all on function public.admin_grant_access(text, text, int, text) from public, anon;
revoke all on function public.admin_revoke_access(uuid, text, boolean) from public, anon;
revoke all on function public.admin_upsert_lesson(text, int, text, int, text, text, boolean) from public, anon;
grant execute on function public.admin_grant_access(text, text, int, text) to authenticated;
grant execute on function public.admin_revoke_access(uuid, text, boolean) to authenticated;
grant execute on function public.admin_upsert_lesson(text, int, text, int, text, text, boolean) to authenticated;

-- ---------- Datos iniciales ----------
insert into public.courses (id, title) values ('roblox-luau', 'Programación de juegos en Roblox con Luau')
on conflict (id) do update set title = excluded.title;
