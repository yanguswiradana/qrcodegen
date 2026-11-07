-- Migration: kunci check_rate dari anon (tiket T-05, keputusan B).
-- Lubang: check_rate SECURITY DEFINER + grant anon menerima p_key bebas,
-- sehingga siapa pun bisa membakar bucket create:<uuid-korban>.
-- Perbaikan:
-- 1. check_rate: hanya untuk sesi login, dan suffix key WAJIB = auth.uid().
--    Anon (uid null) selalu ditolak.
-- 2. check_rate_key: jalur API key. Autentikasi via digest key_hash
--    (seperti auth_api_key), key bucket dibangun di DALAM fungsi dari uid
--    hasil verifikasi sehingga tak bisa dipalsukan.

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
  uid text := auth.uid()::text;
begin
  if uid is null then
    return false;
  end if;
  if p_key <> 'create:' || uid then
    return false;
  end if;
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

create or replace function public.check_rate_key(
  p_key text,
  p_limit int default 20,
  p_window_secs int default 3600
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  uid uuid;
  b record;
  v_key text;
begin
  select ak.created_by into uid
    from public.api_keys ak
   where ak.key_hash = encode(digest(p_key, 'sha256'), 'hex');
  if not found then
    return false;
  end if;

  v_key := 'create:' || uid::text;
  select * into b from public.rate_buckets where key = v_key;
  if not found then
    insert into public.rate_buckets (key, count) values (v_key, 1);
    return true;
  end if;
  if now() - b.window_start > make_interval(secs => p_window_secs) then
    update public.rate_buckets set count = 1, window_start = now() where key = v_key;
    return true;
  end if;
  if b.count >= p_limit then
    return false;
  end if;
  update public.rate_buckets set count = count + 1 where key = v_key;
  return true;
end;
$$;

grant execute on function public.check_rate(text, int, int) to anon, authenticated;
grant execute on function public.check_rate_key(text, int, int) to anon, authenticated;
