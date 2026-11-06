-- Migration: password opsional per link (hash SHA-256, verifikasi via RPC agar hash tidak bocor ke anon).

alter table public.links
  add column if not exists password_hash text null;

create or replace function public.verify_link_password(p_slug text, p_password text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  h text;
begin
  select password_hash into h from public.links where slug = p_slug;
  if not found or h is null then
    return true;
  end if;
  return h = encode(digest(p_password, 'sha256'), 'hex');
end;
$$;

grant execute on function public.verify_link_password(text, text) to anon, authenticated;
