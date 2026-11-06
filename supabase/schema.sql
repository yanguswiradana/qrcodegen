-- Jalankan di Supabase SQL Editor.

create extension if not exists "pgcrypto";

-- Short link (dynamic QR nunjuk ke /r/:slug)
create table if not exists public.links (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  target_url text not null,
  title text,
  clicks bigint not null default 0,
  expires_at timestamptz null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- QR: static (payload langsung) atau dynamic (link_id nunjuk ke links)
create table if not exists public.qr_codes (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('static', 'dynamic')),
  payload text,
  link_id uuid references public.links(id) on delete set null,
  style jsonb not null default '{}'::jsonb,
  name text,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Scan/click analytics
create table if not exists public.scans (
  id uuid primary key default gen_random_uuid(),
  link_id uuid references public.links(id) on delete cascade,
  qr_code_id uuid references public.qr_codes(id) on delete set null,
  source text not null default 'link',
  ip text,
  country text,
  device text,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.links enable row level security;
alter table public.qr_codes enable row level security;
alter table public.scans enable row level security;

create policy "own links" on public.links
  for all using (auth.uid() = created_by) with check (auth.uid() = created_by);

create policy "own qr" on public.qr_codes
  for all using (auth.uid() = created_by) with check (auth.uid() = created_by);

create policy "read own scans" on public.scans
  for select using (
    link_id in (select id from public.links where created_by = auth.uid())
    or qr_code_id in (select id from public.qr_codes where created_by = auth.uid())
  );
