-- Esquema do planner da Isabelle.
-- Toda tabela tem: id (uuid gerado no cliente), user_id, created_at, updated_at (definido pelo cliente),
-- deleted_at (apagar é marcar) e synced_at (definido aqui, no servidor, a cada gravação).

-- ---------------------------------------------------------------- configurações
create table public.settings (
  id uuid primary key,
  user_id uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  synced_at timestamptz not null default now(),
  course_name text not null default 'Economia',
  institution_name text not null default 'UNIFESP',
  first_semester_code text not null default '2026.1',
  unique (user_id)
);

-- ---------------------------------------------------------------- faculdade
create table public.semesters (
  id uuid primary key,
  user_id uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  synced_at timestamptz not null default now(),
  code text not null,
  starts_on date,
  ends_on date,
  pass_grade numeric not null default 6,
  closed_at timestamptz
);

create table public.subjects (
  id uuid primary key,
  user_id uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  synced_at timestamptz not null default now(),
  semester_id uuid not null references public.semesters (id),
  name text not null,
  weekday smallint not null check (weekday between 0 and 6),
  starts_at time,
  ends_at time,
  ends_on date,
  ends_on_confirmed boolean not null default true,
  absence_limit int,
  absence_unit int not null default 1,
  prior_absences int not null default 0,
  grade_rule jsonb not null default '{}'::jsonb,
  rule_text text not null default ''
);

create table public.assessments (
  id uuid primary key,
  user_id uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  synced_at timestamptz not null default now(),
  subject_id uuid not null references public.subjects (id),
  kind text not null check (kind in ('prova', 'seminario', 'trabalho', 'atividade')),
  title text not null,
  rule_key text,
  due_on date,
  date_confirmed boolean not null default true,
  date_source text not null default 'manual' check (date_source in ('google', 'manual')),
  google_event_id text,
  weight numeric,
  points_max numeric,
  grade numeric,
  done boolean not null default false,
  condition_text text
);

create table public.absences (
  id uuid primary key,
  user_id uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  synced_at timestamptz not null default now(),
  subject_id uuid not null references public.subjects (id),
  on_date date not null
);

-- ---------------------------------------------------------------- hoje
create table public.todos (
  id uuid primary key,
  user_id uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  synced_at timestamptz not null default now(),
  week_start date not null,
  position int not null,
  text text not null default '',
  done boolean not null default false,
  carried boolean not null default false
);

create table public.important_checks (
  id uuid primary key,
  user_id uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  synced_at timestamptz not null default now(),
  item_key text not null,
  on_date date not null,
  done boolean not null default true,
  unique (user_id, item_key, on_date)
);

create table public.recurring_dues (
  id uuid primary key,
  user_id uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  synced_at timestamptz not null default now(),
  name text not null,
  day_of_month int not null check (day_of_month between 1 and 31)
);

create table public.rest_weeks (
  id uuid primary key,
  user_id uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  synced_at timestamptz not null default now(),
  week_start date not null,
  unique (user_id, week_start)
);

-- ---------------------------------------------------------------- metas e hábitos
create table public.goals (
  id uuid primary key,
  user_id uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  synced_at timestamptz not null default now(),
  area text not null check (area in ('carreira', 'financas', 'saude', 'relacoes', 'lazer', 'desenvolvimento')),
  name text not null,
  kind text not null check (kind in ('habits', 'count')),
  target numeric,
  progress numeric not null default 0,
  unit text,
  due_on date,
  focus_period text,
  archived boolean not null default false,
  auto_source text
);

create table public.habits (
  id uuid primary key,
  user_id uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  synced_at timestamptz not null default now(),
  habit_key text not null,
  goal_id uuid references public.goals (id),
  group_label text,
  color text,
  name text not null,
  subtitle text,
  kind text not null check (kind in ('daily', 'weekly_quota', 'weekdays', 'monthly', 'optional')),
  quota int,
  weekdays int[],
  auto_source text,
  valid_from date not null,
  valid_to date,
  position int not null default 0
);

create table public.habit_checks (
  id uuid primary key,
  user_id uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  synced_at timestamptz not null default now(),
  habit_key text not null,
  on_date date not null,
  done boolean not null default true,
  source text not null default 'manual' check (source in ('manual', 'auto')),
  unique (user_id, habit_key, on_date)
);

-- ---------------------------------------------------------------- wishlist
create table public.wishes (
  id uuid primary key,
  user_id uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  synced_at timestamptz not null default now(),
  name text not null,
  avg_price numeric,
  priority text not null default 'media' check (priority in ('alta', 'media', 'baixa')),
  bought_on date,
  paid_price numeric
);

-- ---------------------------------------------------------------- repertório
create table public.media_items (
  id uuid primary key,
  user_id uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  synced_at timestamptz not null default now(),
  category text not null check (category in ('livro', 'filme', 'serie')),
  title text not null,
  author text,
  status text not null check (status in ('quero', 'andamento', 'feito')),
  started_on date,
  finished_on date,
  rating numeric check (rating >= 0 and rating <= 10),
  summary text,
  favorite boolean not null default false
);

-- ---------------------------------------------------------------- cursos
create table public.courses (
  id uuid primary key,
  user_id uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  synced_at timestamptz not null default now(),
  name text not null,
  position int not null default 0,
  site_url text,
  description text
);

create table public.course_modules (
  id uuid primary key,
  user_id uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  synced_at timestamptz not null default now(),
  course_id uuid not null references public.courses (id),
  position int not null default 0,
  number int,
  title text not null
);

create table public.course_blocks (
  id uuid primary key,
  user_id uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  synced_at timestamptz not null default now(),
  module_id uuid not null references public.course_modules (id),
  position int not null default 0,
  title text,
  minutes int
);

create table public.course_lessons (
  id uuid primary key,
  user_id uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  synced_at timestamptz not null default now(),
  block_id uuid not null references public.course_blocks (id),
  position int not null default 0,
  title text not null,
  kind text,
  url text,
  seconds int,
  done_on date
);

-- ---------------------------------------------------------------- credencial do Google (só a Edge Function lê)
create table public.google_credentials (
  user_id uuid primary key,
  refresh_token text not null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- última escrita vence
create or replace function public.sync_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.synced_at := clock_timestamp();
    return new;
  end if;
  -- UPDATE: só aceita se o updated_at recebido for maior que o guardado.
  if new.updated_at <= old.updated_at then
    return null;
  end if;
  new.id := old.id;
  new.user_id := old.user_id;
  new.created_at := old.created_at;
  new.synced_at := clock_timestamp();
  return new;
end;
$$;

revoke all on function public.sync_guard() from public, anon, authenticated;

-- ---------------------------------------------------------------- RLS, gatilho e índice em todas as tabelas
do $$
declare
  t text;
  tabelas text[] := array[
    'settings', 'semesters', 'subjects', 'assessments', 'absences',
    'todos', 'important_checks', 'recurring_dues', 'rest_weeks',
    'goals', 'habits', 'habit_checks',
    'wishes', 'media_items',
    'courses', 'course_modules', 'course_blocks', 'course_lessons'
  ];
begin
  foreach t in array tabelas loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "somente_a_isabelle" on public.%I for all to authenticated
         using (user_id = (select auth.uid()) and lower(coalesce((select auth.jwt() ->> ''email''), '''')) = ''xisaribeiro@gmail.com'')
         with check (user_id = (select auth.uid()) and lower(coalesce((select auth.jwt() ->> ''email''), '''')) = ''xisaribeiro@gmail.com'')',
      t);
    execute format('create trigger sync_guard before insert or update on public.%I for each row execute function public.sync_guard()', t);
    execute format('create index %I on public.%I (user_id, synced_at)', t || '_user_synced_idx', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end;
$$;

-- Credencial do Google: RLS ligado e nenhuma política. Só a service role acessa.
alter table public.google_credentials enable row level security;
revoke all on public.google_credentials from anon, authenticated;

-- Índices das chaves estrangeiras
create index subjects_semester_idx on public.subjects (semester_id);
create index assessments_subject_idx on public.assessments (subject_id);
create index absences_subject_idx on public.absences (subject_id);
create index habits_goal_idx on public.habits (goal_id);
create index course_modules_course_idx on public.course_modules (course_id);
create index course_blocks_module_idx on public.course_blocks (module_id);
create index course_lessons_block_idx on public.course_lessons (block_id);
