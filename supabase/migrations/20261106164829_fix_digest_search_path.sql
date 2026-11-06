-- Migration: perbaiki search_path fungsi yang pakai digest() (pgcrypto).
-- Latar: di Supabase, pgcrypto terinstal di skema extensions, bukan public.
-- Dengan "set search_path = public", digest() tidak ketemu (42883) sehingga
-- verify_link_password + auth_api_key SELALU error: link password tak pernah
-- terbuka & API key tak pernah valid. Tambahkan extensions ke search_path.

create or replace function public.verify_link_password(p_slug text, p_password text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
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

create or replace function public.auth_api_key(p_key text)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
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
