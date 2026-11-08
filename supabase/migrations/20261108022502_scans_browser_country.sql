-- Migration: analitik negara + browser (tiket T-09, keputusan D).
-- Sumber country = header x-vercel-ip-country (gratis, kasar, cukup untuk
-- portfolio). Browser diparse di aplikasi dari UA.

alter table public.scans
  add column if not exists browser text null;

-- resolve_link: tambah param p_browser (default null = kompatibel).
create or replace function public.resolve_link(
  p_slug text,
  p_source text default 'link',
  p_ua text default null,
  p_device text default null,
  p_ip text default null,
  p_browser text default null,
  p_country text default null
)
returns table (link_id uuid, target_url text, is_expired boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  select l.id, l.target_url, l.expires_at
    into r
    from public.links l
   where l.slug = p_slug;

  if not found then
    return;
  end if;

  if r.expires_at is not null and now() > r.expires_at then
    link_id := r.id;
    target_url := r.target_url;
    is_expired := true;
    return next;
    return;
  end if;

  update public.links
     set clicks = clicks + 1
   where id = r.id;

  insert into public.scans (link_id, source, user_agent, device, ip, browser, country)
  values (r.id, coalesce(p_source, 'link'), p_ua, p_device, p_ip, p_browser, p_country);

  link_id := r.id;
  target_url := r.target_url;
  is_expired := false;
  return next;
end;
$$;

-- link_stats: tambah agregat by_country + by_browser.
-- (Return type berubah sehingga fungsi lama harus di-drop dulu.)
drop function if exists public.link_stats(text);
create or replace function public.link_stats(p_slug text)
returns table (
  slug text,
  target_url text,
  clicks bigint,
  created_at timestamptz,
  by_device jsonb,
  daily jsonb,
  by_country jsonb,
  by_browser jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  l record;
begin
  select li.slug, li.target_url, li.clicks, li.created_at, li.id
    into l
    from public.links li
   where li.slug = p_slug;

  if not found then
    return;
  end if;

  slug := l.slug;
  target_url := l.target_url;
  clicks := l.clicks;
  created_at := l.created_at;

  select coalesce(jsonb_object_agg(t.device, t.cnt), '{}'::jsonb) into by_device
  from (
    select coalesce(device, 'unknown') as device, count(*) as cnt
      from public.scans
     where link_id = l.id
     group by 1
  ) t;

  select coalesce(jsonb_object_agg(t.d, t.cnt), '{}'::jsonb) into daily
  from (
    select to_char(created_at, 'YYYY-MM-DD') as d, count(*) as cnt
      from public.scans
     where link_id = l.id
       and created_at >= now() - interval '7 days'
     group by 1
  ) t;

  select coalesce(jsonb_object_agg(t.c, t.cnt), '{}'::jsonb) into by_country
  from (
    select coalesce(nullif(country, ''), 'unknown') as c, count(*) as cnt
      from public.scans
     where link_id = l.id
     group by 1
  ) t;

  select coalesce(jsonb_object_agg(t.b, t.cnt), '{}'::jsonb) into by_browser
  from (
    select coalesce(nullif(browser, ''), 'unknown') as b, count(*) as cnt
      from public.scans
     where link_id = l.id
     group by 1
  ) t;

  return next;
end;
$$;
