-- Migration: rate limit bucket + blocklist.

create table if not exists public.rate_buckets (
  key text primary key,
  count int not null default 1,
  window_start timestamptz not null default now()
);

create table if not exists public.blocked_hosts (
  host text primary key,
  reason text,
  created_at timestamptz not null default now()
);

-- seed awal: host phishing/malware umum
insert into public.blocked_hosts (host, reason) values
  ('bit.ly', 'shortener loop'),
  ('tinyurl.com', 'shortener loop')
on conflict do nothing;

alter table public.rate_buckets enable row level security;
alter table public.blocked_hosts enable row level security;

-- RPC: cek + tambah hit rate limit (default 20/jam per user untuk create link)
create or replace function public.check_rate(
  p_key text,
  p_limit int default 20,
  p_window_secs int default 3600
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  b record;
begin
  select * into b from public.rate_buckets where key = p_key;
  if not found then
    insert into public.rate_buckets (key, count) values (p_key, 1);
    return true;
  end if;
  if now() - b.window_start > make_interval(secs => p_window_secs) then
    update public.rate_buckets set count = 1, window_start = now() where key = p_key;
    return true;
  end if;
  if b.count >= p_limit then
    return false;
  end if;
  update public.rate_buckets set count = count + 1 where key = p_key;
  return true;
end;
$$;

grant execute on function public.check_rate(text, int, int) to anon, authenticated;
