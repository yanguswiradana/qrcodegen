-- Migration: RPC statistik publik per slug (agregat saja, tanpa baris mentah).
create or replace function public.link_stats(p_slug text)
returns table (
  slug text,
  target_url text,
  clicks bigint,
  created_at timestamptz,
  by_device jsonb,
  daily jsonb
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

  return next;
end;
$$;

grant execute on function public.link_stats(text) to anon, authenticated;
