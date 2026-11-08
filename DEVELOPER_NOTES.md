# Catatan Developer — QRGen

Dokumen ini untuk agent/sesi berikutnya yang melanjutkan proyek ini.
Status terakhir: 2026-11-06. Repo: https://github.com/yanguswiradana/qrcodegen
Demo: https://qrcodegen-arxcode.vercel.app/

## 1. Cara menjalankan lokal

```bash
npm run dev -- -p 3002   # port 3000/3001 dipakai proyek lain
```

Env ada di `.env.local` (tidak di-commit): `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY` (= publishable key). Nilai aktual:
URL `https://nmshwrptczkuxhwpoyky.supabase.co`, project ref `nmshwrptczkuxhwpoyky`.
`dev-3002.log` adalah log dev server, sudah di-ignore.

## 2. Arsitektur singkat

- `src/app/page.tsx` — landing publik: hero + `FreeQrGate` (3x QR anonim via
  localStorage key `qrgen_free_count`). TIDAK ada link login/dashboard di landing
  (disembunyikan sengaja, keputusan owner). Akses admin via `/login` manual.
- `src/app/login/page.tsx` — auth email+password (Supabase). Confirm email OFF.
- `src/app/dashboard/page.tsx` — server component, proteksi `getUser()` +
  proxy (`src/proxy.ts` redirect `/dashboard` → `/login` bila anonim).
- `src/app/api/links/route.ts` — POST (alias custom, expiry, password SHA-256,
  rate limit `check_rate` 20/jam/user, blocklist `blocked_hosts`), PATCH, DELETE,
  GET. Auth ganda: sesi login ATAU `Authorization: Bearer qrgen_...`
  (verifikasi via RPC `auth_api_key`).
- `src/app/api/keys/route.ts` — kelola API key (plaintext tampil sekali).
- `src/app/r/[slug]/page.tsx` — redirect + gate: expired → `/`;
  berpassword → `PasswordGate` (`?pw=`), verifikasi via RPC
  `verify_link_password`; sukses → `resolve_link` (clicks++ + insert scans) → redirect.
- `src/app/s/[slug]/page.tsx` — statistik publik via RPC `link_stats`.
- Komponen: `QrStaticForm` (warna/logo/frame/caption/ukuran 256–1024),
  `QrDynamicForm`, `BulkCreate` (CSV max 100), `LinksList` (server, fetch) →
  `LinksTable` (client, tabel), `LinkRowActions`, `QrDownloadButton`
  (pakai `shortBase()` → env `NEXT_PUBLIC_SHORT_DOMAIN` bila diset),
  `ScansChart`, `ScansPanel`, `ApiKeys`, `PasswordGate`, `FreeQrGate`.
- `src/lib/`: `qr.ts` (`toPngDataUrl`/`toSvg`), `slug.ts`, `short.ts`,
  `supabase/{client,server,middleware}.ts`.
- Style: `src/app/globals.css` — dark theme, class util `qr-card`, `qr-btn`,
  `qr-btn-ghost`, `qr-input`, `qr-table`, `qr-swatch`, `qr-file`. Aksen lime
  (`--accent: #bef264`). Preview `<img>` QR biarkan border putih (scanability).

## 3. Database (Supabase, via CLI — JANGAN via SQL Editor manual)

Project sudah link (`npx supabase link` done). Alur migrasi:

```bash
npx supabase migration new nama_fitur
# isi file SQL, komentar pakai -- (JANGAN //, error 42601)
npx supabase db push --remote --yes --include-all
npx supabase migration list --remote   # verifikasi Local == Remote
```

Wajib konfirmasi owner sebelum `db push` (ubah produksi, irreversible).
Migrasi destruktif (drop table/kolom) tolak otomatis.

Urutan migrasi remote saat ini:
1. `20261106104826_rate_limit_blocklist` — `rate_buckets` + RPC `check_rate` +
   `blocked_hosts` (seed bit.ly, tinyurl).
2. `20261106131549_public_stats_rpc` — RPC `link_stats`.
3. `20261106132303_fix_link_stats_ambiguous` — fix ambiguitas `created_at`
   (alias `s.created_at` di subquery).
4. `20261106132520_link_password` — kolom `password_hash` + RPC
   `verify_link_password` (perlu `pgcrypto` untuk `digest`).
5. `20261106132748_api_keys` — tabel `api_keys` + RPC `auth_api_key`.
6. `20261106162946_expiry_resolve_link` — kolom `expires_at` + RPC `resolve_link`.
7. `20261106164620_public_link_redirect` — RPC `get_link_public` (target,
   expires, has_password; TANPA password_hash). Wajib dipakai `/r/[slug]`
   karena RLS links hanya "own links" → select anon langsung selalu kosong
   (sempat bikin SEMUA short link publik mental ke "/").
8. `20261106164829_fix_digest_search_path` — `verify_link_password` +
   `auth_api_key` diganti `set search_path = public, extensions`. pgcrypto di
   Supabase terinstal di skema `extensions`; search_path lama (= public saja)
   bikin `digest()` 42883 → link password tak pernah terbuka + API key mati.
9. `20261107145521_pw_rate_limit` — `verify_link_password` hitung gagal/jam
   per slug di `rate_buckets` (`pw:<slug>`, max 10/jam), benar = reset.
10. `20261107145625_check_rate_owner` — `check_rate` tolak anon & key milik
    orang lain; tambah `check_rate_key` (verifikasi digest internal) untuk
    jalur API key.
11. `20261107150057_api_links_rpc` — `api_create_link` + `api_list_links`.
    Mode Bearer tanpa JWT selalu gagal RLS → seluruh tulis/baca API lewat
    RPC definer ini (validasi + rate limit di dalam).
12. `20261108022502_scans_browser_country` — kolom `scans.browser`,
    `resolve_link` tambah `p_browser`/`p_country`, `link_stats` tambah
    `by_country`/`by_browser`. (Awalnya 42702 ambiguitas `created_at` —
    OUT param bentrok kolom tak berkualifikasi.)
13. `20261108022931_fix_link_stats_ambiguous2` — kualifikasi `s.created_at`
    dkk dengan alias `s` (pelajaran #3 terulang, jangan diulangi lagi).

File `supabase/schema.sql` + `supabase/migration_002.sql` adalah arsip awal,
BUKAN sumber migrasi (jangan push ulang — policy duplikat).
`supabase/migrations/20251106000000_initial.sql` sudah dipindah ke `/tmp`
(backup), tidak ada di repo — benar, jangan kembalikan.

## 4. Pelajaran dari bug nyata (jangan ulangi)

- **Server/client campur**: `LinksList` (pakai `next/headers` via supabase/server)
  + tombol client satu file → build error "Pages Router". Pola baku:
  server wrapper fetch → lempar ke komponen `"use client"` (contoh: LinksTable).
- **Komentar `//` di SQL** → syntax error. Selalu `--`.
- **`QrStyle.width`** — properti ukuran download ada di `src/lib/qr.ts`,
  jangan hardcode.
- **`ALIAS_RE`** pernah terhapus saat edit import — `tsc --noEmit` wajib
  sebelum commit (pernah lolos 2 error ke-push).
- **`next.config.ts`**: `cacheComponents: true` bentrok dengan route config Next 16
  → sudah dimatikan, jangan nyalakan lagi.
- **PostgREST schema cache**: RPC baru kadang 404 `PGRST202` sebentar setelah
  push — tunggu ±1 menit lalu retry, bukan bug kode. Bedakan dengan 404
  `42883` + `digest() does not exist` = search_path salah (nyata, bukan cache).
- **Anon tidak bisa SELECT links**: RLS "own links" → halaman publik (`/r/`)
  WAJIB lewat RPC definer kolom-minimal, jangan select langsung.
- **Mode Bearer (API key) tanpa JWT selalu gagal RLS** — INSERT/SELECT
  langsung via anon client ditolak. Pola baku: RPC definer yang verifikasi
  key via digest di DALAM fungsi (`api_create_link`, `api_list_links`,
  `check_rate_key`). Jangan pernah oper `created_by` dari client.
- **Port**: dev WAJIB `-p 3002`. Proses stale → EADDRINUSE; kill via
  `taskkill //F //PID`.

## 5. Batasan sesi ini (keterbatasan model, bukan kode)

- Model tanpa input gambar: screenshot/Read PNG selalu "Media omitted".
  Minta owner deskripsikan visual via teks.
- Daftar model `ListModels` tidak ada flag vision — klaim vision harus
  diverifikasi dengan tes kirim gambar, bukan dari nama model.

## 6. Keputusan produk yang berlaku

- Freemium: landing 3x QR anonim (localStorage — gate lembut, bisa reset
  via incognito; itu disadari, bukan bug). Server-side gate ditunda sampai
  ada sinyal abuse.
- Login/dashboard disembunyikan dari publik; owner akses manual.
- OSS MIT + demo Vercel sebagai portfolio (hybrid, bukan SaaS berbayar).
- `NEXT_PUBLIC_SHORT_DOMAIN` opsional untuk QR download domain custom.
