-- Migration 002: expiry + public resolve function (redirect + scan catat).
-- Jalankan sekali di Supabase SQL Editor.

alter table public.links
  add column if not exists expires_at timestamptz null;

create or replace function public.resolve_link(
  p_slug text,
  p_source text default 'link',
  p_ua text default null,
  p_device text default null,
  p_ip text default null
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

  insert into public.scans (link_id, source, user_agent, device, ip)
  values (r.id, coalesce(p_source, 'link'), p_ua, p_device, p_ip);

  link_id := r.id;
  target_url := r.target_url;
  is_expired := false;
  return next;
end;
$$;

grant execute on function public.resolve_link(text, text, text, text, text) to anon, authenticated;
