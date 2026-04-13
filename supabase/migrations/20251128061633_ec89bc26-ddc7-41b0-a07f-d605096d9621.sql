-- ================================================================
-- PHASE 1: Complete Database Schema for adbroll
-- ================================================================

-- ============================================================
-- 1. CREATE DAILY FEED TABLE (Top 20 videos)
-- ============================================================
create table public.daily_feed (
  id uuid primary key default gen_random_uuid(),
  rango_fechas text not null,
  descripcion_video text not null,
  duracion text not null,
  creador text not null,
  fecha_publicacion text not null,
  ingresos_mxn numeric(12,2) not null,
  ventas integer not null,
  visualizaciones integer not null,
  gpm_mxn numeric(12,2),
  cpa_mxn numeric(12,2) not null,
  ratio_ads numeric(5,2),
  coste_publicitario_mxn numeric(12,2) not null,
  roas numeric(5,2) not null,
  tiktok_url text not null,
  transcripcion_original text,
  guion_ia text,
  created_at timestamptz default now()
);

-- Index for faster sorting by revenue
create index idx_daily_feed_ingresos on public.daily_feed(ingresos_mxn desc);

-- Enable RLS
alter table public.daily_feed enable row level security;

-- Policy: All authenticated users can read
create policy "Authenticated users can view daily feed"
  on public.daily_feed
  for select
  to authenticated
  using (true);

-- Policy: No direct modifications (only via edge function)
create policy "No direct modifications"
  on public.daily_feed
  for all
  to authenticated
  using (false);

-- ============================================================
-- 2. CREATE USER ROLES SYSTEM (Security Definer)
-- ============================================================

-- Create role enum
create type public.app_role as enum ('user', 'founder');

-- Create user_roles table
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz default now(),
  unique(user_id, role)
);

-- Enable RLS
alter table public.user_roles enable row level security;

-- Security definer function to check roles (prevents recursive RLS)
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

-- Policy: Users can view their own roles
create policy "Users can view own roles"
  on public.user_roles
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Policy: Only founders can insert roles (managed manually)
create policy "Only founders manage roles"
  on public.user_roles
  for all
  to authenticated
  using (public.has_role(auth.uid(), 'founder'));

-- ============================================================
-- 3. CREATE PROFILES TABLE
-- ============================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Trigger to auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name'
  );
  
  -- Auto-assign 'user' role to everyone
  insert into public.user_roles (user_id, role)
  values (new.id, 'user');
  
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- RLS Policies
create policy "Users can view all profiles"
  on public.profiles
  for select
  to authenticated
  using (true);

create policy "Users can update own profile"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id);

-- ============================================================
-- 4. CREATE CUSTOM SCRIPTS TABLE (Versioned)
-- ============================================================

create table public.guiones_personalizados (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.daily_feed(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  contenido text not null,
  version_number integer not null default 1,
  created_at timestamptz default now(),
  unique(video_id, user_id, version_number)
);

-- Index for user's script history
create index idx_guiones_user_video on public.guiones_personalizados(user_id, video_id, created_at desc);

-- Enable RLS
alter table public.guiones_personalizados enable row level security;

-- Policy: Users can only read their own scripts
create policy "Users can view own scripts"
  on public.guiones_personalizados
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Policy: Users can insert their own scripts
create policy "Users can create own scripts"
  on public.guiones_personalizados
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Policy: Users can update their own scripts
create policy "Users can update own scripts"
  on public.guiones_personalizados
  for update
  to authenticated
  using (auth.uid() = user_id);

-- Policy: Users can delete their own scripts
create policy "Users can delete own scripts"
  on public.guiones_personalizados
  for delete
  to authenticated
  using (auth.uid() = user_id);