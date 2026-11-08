-- Migration: api_list_links dukung search + pagination (tiket T-06).
-- Return berubah table -> jsonb {links, total} sehingga fungsi lama di-drop.
-- q dicocokkan ke slug ATAU target_url (case-insensitive, wildcard di-escape).

drop function if exists public.api_list_links(text);

create or replace function public.api_list_links(
  p_key text,
  p_query text default null,
  p_page int default 1,
  p_per_page int default 50
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  uid uuid;
  q text;
  pg int;
  pp int;
  total bigint;
  rows jsonb;
begin
  select ak.created_by into uid
    from public.api_keys ak
   where ak.key_hash = encode(digest(p_key, 'sha256'), 'hex');
  if not found then
    return jsonb_build_object('ok', false, 'code', 'bad_key');
  end if;

  q := btrim(coalesce(p_query, ''));
  pg := greatest(coalesce(p_page, 1), 1);
  pp := least(greatest(coalesce(p_per_page, 50), 1), 200);
  -- Escape wildcard LIKE: \ % _
  q := replace(replace(replace(q, '\', '\\'), '%', '\%'), '_', '\_');

  select count(*) into total
    from public.links l
   where l.created_by = uid
     and (q = '' or l.slug ilike '%' || q || '%' escape '\'
                   or l.target_url ilike '%' || q || '%' escape '\');

  select coalesce(jsonb_agg(t), '[]'::jsonb) into rows
  from (
    select l.slug, l.target_url, l.clicks, l.expires_at, l.created_at
      from public.links l
     where l.created_by = uid
       and (q = '' or l.slug ilike '%' || q || '%' escape '\'
                     or l.target_url ilike '%' || q || '%' escape '\')
     order by l.created_at desc
     limit pp offset (pg - 1) * pp
  ) t;

  return jsonb_build_object('ok', true, 'links', rows, 'total', total);
end;
$$;

grant execute on function public.api_list_links(text, text, int, int) to anon, authenticated;
