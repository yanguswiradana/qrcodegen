# QRGen — QR Code + Short Link (self-hostable)

QR generator + short link satu dashboard. Static QR instan, dynamic QR via
redirect `/r/:slug` dengan tracking scan. Stack: Next.js 16 + Supabase
(Postgres + Auth).

Live demo (portfolio): https://qrcodegen-arxcode.vercel.app/

## Fitur

- Static QR: URL/teks/WiFi/vCard, warna, logo tengah (contain-fit, auto ECC H),
  frame + caption, ECC L/M/Q/H, export PNG 256/512/1024 + SVG (SVG = preview)
- Dynamic QR + short link: alias custom (bisa rename), expiry (halaman khusus
  kedaluwarsa, slug asing → 404), password link (rate limit 10x/jam), edit
  target, hapus
- Redirect `/r/:slug` + counter klik + log scan (device, browser, negara, UA)
- Public stats `/s/:slug` — halaman scan publik per link (grafik 7 hari,
  breakdown device/browser/negara)
- Dashboard: search + pagination + hapus massal + unduh ZIP semua QR,
  bulk CSV 100/batch (pra-validasi), grafik 7 hari, 30 scan terakhir,
  navigasi section
- Keamanan: rate limit 20 create/jam/user, blocklist domain, RLS own-data,
  operasi publik/privileged lewat RPC `SECURITY DEFINER`
- API: key per user (`Authorization: Bearer qrgen_...`), POST/GET/PATCH/DELETE
  `/api/links`, CRUD `/api/keys` (lihat [dokumentasi API](#api))
- Freemium: landing 3x QR anonim (localStorage), login = unlimited
- Auth: email + password (Supabase)

## API

Base URL lokal: `http://localhost:3002`. Auth ganda tiap request:

- Sesi login (cookie browser), atau
- Header `Authorization: Bearer qrgen_...` (buat key di dashboard → API keys;
  key tampil sekali, prefix `qrgen_xxx...` sebagai pengenal).

Rate limit: **20 create/jam per user** (429 bila lewat), **10x salah
password/jam per slug** (terkunci sementara, pesan netral).

### `POST /api/links` — buat link

```bash
curl -X POST http://localhost:3002/api/links \
  -H "Authorization: Bearer qrgen_..." \
  -H "Content-Type: application/json" \
  -d '{"target_url":"https://contoh.id/promo","alias":"promo","expires_at":"2027-01-01T00:00:00Z","password":"rahasia"}'
# -> {"slug":"promo"}   (tanpa alias: slug acak 7 char)
```

`expires_at` / `password` opsional. Error: `400` URL/alias/expiry tidak valid,
`403` domain diblokir, `409` alias dipakai, `429` limit, `401` key salah.

### `GET /api/links` — daftar link (50 terbaru)

```bash
curl http://localhost:3002/api/links -H "Authorization: Bearer qrgen_..."
# -> {"links":[{"slug":"promo","target_url":"...","clicks":3,"expires_at":null,"created_at":"..."}]}
```

### `PATCH /api/links` — edit (sesi login saja)

```bash
curl -X PATCH http://localhost:3002/api/links \
  --cookie "sb-<ref>-auth-token.0=..." \
  -H "Content-Type: application/json" \
  -d '{"slug":"promo","target_url":"https://contoh.id/baru","new_slug":"promo25","expires_at":null,"password":""}'
```

`new_slug` opsional (validasi + 409 bila bentrok, QR lama ikut mati).
`password: ""` melepas password, `expires_at: null` melepas expiry.

### `DELETE /api/links?slug=promo` — hapus (sesi login saja)

### `GET/POST/DELETE /api/keys` — kelola API key (sesi login saja)

```bash
curl -X POST http://localhost:3002/api/keys \
  --cookie "sb-<ref>-auth-token.0=..." \
  -H "Content-Type: application/json" -d '{"name":"ci"}'
# -> {"api_key":"qrgen_...","prefix":"qrgen_..."}   # salin sekarang!
```

## Self-host (5 menit)

1. Clone + install:
   ```bash
   git clone https://github.com/yanguswiradana/qrcodegen
   cd qrcodegen
   npm install
   ```
2. Buat project di [Supabase](https://supabase.com) (free tier cukup).
3. Copy env:
   ```bash
   cp .env.example .env.local
   ```
   Isi `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   (Settings → API; anon = publishable key).
4. Migrasi DB (butuh [Supabase CLI](https://supabase.com/docs/guides/cli)):
   ```bash
   npx supabase link --project-ref <REF>
   npx supabase db push --remote --yes --include-all
   ```
   13 migrasi di `supabase/migrations/` (rate limit, stats, password, API
   keys, expiry, redirect publik, analytics…). Alternatif tanpa CLI:
   jalankan file migrasi satu-satu di SQL Editor **berurutan**.
5. Supabase Auth: pastikan provider **Email** ON. Confirm email OFF untuk dev, ON untuk prod.
6. Jalankan:
   ```bash
   npm run dev -- -p 3002
   ```
   Buka `http://localhost:3002`, daftar akun, pakai.

## Deploy (Vercel)

Import repo → set env yang sama → deploy. Tambahkan domain prod ke
Supabase Auth → URL Configuration (Site URL + Redirect `/auth/callback`).
Country analytics memakai header `x-vercel-ip-country` (otomatis di Vercel).

## Dev

```bash
npm run dev -- -p 3002   # dev (port 3002, dipakai contoh lain)
npm run build            # production build
npm run smoke            # 7 cek rute ke BASE_URL (default localhost:3002)
npx tsc --noEmit && npx eslint src/   # wajib 0 sebelum commit
```

Catatan untuk sesi berikutnya: baca [DEVELOPER_NOTES.md](DEVELOPER_NOTES.md)
(arsitektur, alur migrasi, pelajaran bug) dan [TIKET.md](TIKET.md) (backlog).

## Struktur

- `src/app/(page, login, dashboard, r/[slug], s/[slug], api/*)` — rute + API
- `src/proxy.ts` — proteksi `/dashboard` (Next 16: `proxy`, bukan `middleware`)
- `src/components/` — form QR, tabel link (+ZIP), grafik, panel scan
- `src/lib/` — client Supabase, generator QR (`toFancySvg`), slug, short domain
- `supabase/migrations/` — 13 migrasi berurutan (CLI)
- `scripts/smoke.mjs` — smoke test

## Lisensi

MIT — bebas pakai, modif, hosting sendiri. Lihat `LICENSE`.
