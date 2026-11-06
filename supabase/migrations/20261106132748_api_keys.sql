-- Migration: API key per user (hash SHA-256, prefix tampil; verifikasi via RPC).

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  prefix text not null,
  key_hash text not null unique,
  name text,
  created_by uuid not null references auth.users(id) on delete cascade,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.api_keys enable row level security;

create policy "own keys" on public.api_keys
  for all using (auth.uid() = created_by) with check (auth.uid() = created_by);

create or replace function public.auth_api_key(p_key text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
begin
  select ak.created_by into uid
    from public.api_keys ak
   where ak.key_hash = encode(digest(p_key, 'sha256'), 'hex');
  if not found then
    return null;
  end if;
  update public.api_keys set last_used_at = now() where key_hash = encode(digest(p_key, 'sha256'), 'hex');
  return uid;
end;
$$;

grant execute on function public.auth_api_key(text) to anon, authenticated;
