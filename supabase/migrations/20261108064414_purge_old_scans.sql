-- Migration: purge scan lama (tiket T-15, keputusan L 2026-11-08).
-- Window default 3 bulan. Total klik AWET (links.clicks tak tersentuh);
-- yang hilang hanya baris mentah scans (breakdown = trailing window).
-- TANPA grant publik: hanya service_role yang boleh eksekusi, dipanggil
-- dari /api/maintenance/purge (Vercel Cron + CRON_SECRET).

create or replace function public.purge_old_scans(p_months int default 3)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  n bigint;
begin
  delete from public.scans
   where created_at < now() - make_interval(months => p_months);
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.purge_old_scans(int) from public, anon, authenticated;
