-- Migration: cabut grant PUBLIC check_rate (pelajaran: anon adalah member
-- PUBLIC, jadi REVOKE FROM anon saja tidak berefek selama grant PUBLIC ada).
-- check_rate_key tetap terbuka untuk anon (verifikasi digest di dalam).

revoke all on function public.check_rate(text, int, int) from public;
