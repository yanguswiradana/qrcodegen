-- Migration: batasi tebakan password link (tiket T-04, keputusan A).
-- Aturan: max 10x SALAH per jam per slug. Benar = counter direset.
-- Kunci dicek SEBELUM baca hash agar timing seragam (tak bocor ada/tidaknya slug).

create or replace function public.verify_link_password(p_slug text, p_password text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  h text;
  b record;
  v_key text := 'pw:' || p_slug;
begin
  select * into b from public.rate_buckets where key = v_key;
  if found and b.count >= 10 and now() - b.window_start < make_interval(secs => 3600) then
    return false;
  end if;

  select password_hash into h from public.links where slug = p_slug;
  if not found or h is null then
    return true;
  end if;

  if h = encode(digest(p_password, 'sha256'), 'hex') then
    delete from public.rate_buckets where key = v_key;
    return true;
  end if;

  insert into public.rate_buckets (key, count, window_start)
  values (v_key, 1, now())
  on conflict (key) do update set
    count = case
      when now() - rate_buckets.window_start > make_interval(secs => 3600) then 1
      else rate_buckets.count + 1
    end,
    window_start = case
      when now() - rate_buckets.window_start > make_interval(secs => 3600) then now()
      else rate_buckets.window_start
    end;
  return false;
end;
$$;
