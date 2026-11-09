-- Migration: drop kolom qr_codes.payload (persetujuan eksplisit owner 2026-11-09).
-- Kolom tak pernah dibaca di mana pun sejak awal; tulis sudah dihentikan di
-- migrasi 20261109065259. Nilai historis = slug link, rekonstruksi via
-- links.slug bila suatu saat dibutuhkan (sebelum push, backup manual via
-- Dashboard → Database → Backups bila ragu).

alter table public.qr_codes
  drop column if exists payload;
