-- Migration: RPC API-key penuh untuk POST/GET /api/links (tiket T-05).
-- Latar: mode Bearer memakai anon key tanpa JWT sehingga RLS
-- (auth.uid() = created_by) menolak INSERT links dan mengosongkan SELECT.
-- Artinya API key selama ini tak bisa dipakai (500 saat create, [] saat list).
-- RPC definer ini memverifikasi key via digest lalu bekerja sebagai pemiliknya,
-- dengan validasi + rate limit yang sama dengan jalur sesi login.

create or replace function public.api_create_link(
  p_key text,
  p_target_url text,
  p_alias text default null,
  p_expires_at timestamptz default null,
  p_password text default null,
  p_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  uid uuid;
  v_slug text;
  v_alias text;
  v_url text;
  v_host text;
  v_blocked text;
  v_id uuid;
  v_is_alias boolean := false;
  allowed boolean;
  i int;
begin
  select ak.created_by into uid
    from public.api_keys ak
   where ak.key_hash = encode(digest(p_key, 'sha256'), 'hex');
  if not found then
    return jsonb_build_object('ok', false, 'code', 'bad_key');
  end if;

  v_url := btrim(coalesce(p_target_url, ''));
  if v_url !~* '^https?://[^/\s?#]+' then
    return jsonb_build_object('ok', false, 'code', 'invalid_url');
  end if;

  v_host := lower(split_part(regexp_replace(v_url, '^https?://', ''), '/', 1));
  v_host := regexp_replace(v_host, '^www\.', '');
  select host into v_blocked from public.blocked_hosts where host = v_host;
  if found then
    return jsonb_build_object('ok', false, 'code', 'blocked');
  end if;

  select public.check_rate_key(p_key, 20, 3600) into allowed;
  if allowed is not true then
    return jsonb_build_object('ok', false, 'code', 'rate_limited');
  end if;

  v_alias := btrim(coalesce(p_alias, ''));
  if v_alias <> '' then
    if v_alias !~ '^[A-Za-z0-9_-]{3,32}$' then
      return jsonb_build_object('ok', false, 'code', 'alias_invalid');
    end if;
    v_slug := v_alias;
    v_is_alias := true;
  else
    for i in 1..5 loop
      v_slug := substr(md5(gen_random_uuid()::text), 1, 7);
      exit when not exists (select 1 from public.links where slug = v_slug);
    end loop;
  end if;

  if p_expires_at is not null and p_expires_at <= now() then
    return jsonb_build_object('ok', false, 'code', 'expiry_invalid');
  end if;

  begin
    insert into public.links (slug, target_url, expires_at, password_hash, created_by)
    values (v_slug,
            v_url,
            p_expires_at,
            case when btrim(coalesce(p_password, '')) = '' then null
                 else encode(digest(p_password, 'sha256'), 'hex') end,
            uid)
    returning id into v_id;

    insert into public.qr_codes (type, link_id, payload, name, created_by)
    values ('dynamic', v_id, v_slug, nullif(btrim(coalesce(p_name, '')), ''), uid);
  exception
    when unique_violation then
      if v_is_alias then
        return jsonb_build_object('ok', false, 'code', 'alias_taken');
      end if;
      return jsonb_build_object('ok', false, 'code', 'conflict');
  end;

  update public.api_keys set last_used_at = now()
   where key_hash = encode(digest(p_key, 'sha256'), 'hex');

  return jsonb_build_object('ok', true, 'slug', v_slug);
end;
$$;

create or replace function public.api_list_links(p_key text)
returns table (
  slug text,
  target_url text,
  clicks bigint,
  expires_at timestamptz,
  created_at timestamptz
)
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
    return;
  end if;

  return query
  select l.slug, l.target_url, l.clicks, l.expires_at, l.created_at
    from public.links l
   where l.created_by = uid
   order by l.created_at desc
   limit 50;
end;
$$;

grant execute on function public.api_create_link(text, text, text, timestamptz, text, text) to anon, authenticated;
grant execute on function public.api_list_links(text) to anon, authenticated;
