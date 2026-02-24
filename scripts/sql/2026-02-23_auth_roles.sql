create extension if not exists pgcrypto;

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  full_name text not null,
  role text not null,
  password_hash text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_app_users_role check (role in ('OFICINA', 'MESA_ENTRADA'))
);

create index if not exists idx_app_users_role on public.app_users (role);
create index if not exists idx_app_users_username on public.app_users (username);

drop trigger if exists trg_app_users_updated_at on public.app_users;
create trigger trg_app_users_updated_at
before update on public.app_users
for each row execute function public.set_updated_at();

create table if not exists public.app_sessions (
  token text primary key,
  user_id uuid not null references public.app_users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_app_sessions_user_id on public.app_sessions (user_id);
create index if not exists idx_app_sessions_expires_at on public.app_sessions (expires_at);

-- Usuarios iniciales (cambiar contraseñas luego de primer login).
-- OFICINA: usuario ofi_admin / pass 1234
-- MESA_ENTRADA: usuario admin / pass 1234
insert into public.app_users (username, full_name, role, password_hash, active)
values
  ('ofi_admin', 'USUARIO OFICINA', 'OFICINA', crypt('1234', gen_salt('bf')), true),
  ('admin', 'USUARIO MESA ENTRADA', 'MESA_ENTRADA', crypt('1234', gen_salt('bf')), true)
on conflict (username) do nothing;
