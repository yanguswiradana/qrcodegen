-- Migration: RPC publik untuk redirect /r/:slug.
-- Latar: RLS links hanya "own links", jadi select anon langsung selalu kosong
-- dan SEMUA short link publik mental ke "/". RPC definer ini mengembalikan
-- kolom minimal (tanpa password_hash) agar redirect + gate password jalan.

create or replace function public.get_link_public(p_slug text)
returns table (
  target_url text,
  expires_at timestamptz,
  has_password boolean
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select l.target_url, l.expires_at, (l.password_hash is not null)
    from public.links l
   where l.slug = p_slug;
end;
$$;

grant execute on function public.get_link_public(text) to anon, authenticated;
