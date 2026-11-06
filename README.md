# QRGen — QR Code + Short Link (self-hostable)

QR generator + short link satu dashboard. Static QR instan, dynamic QR via redirect `/r/:slug` dengan tracking scan. Stack: Next.js 16 + Supabase (Postgres + Auth).

Live demo (portfolio): https://qrcodegen-arxcode.vercel.app/

## Fitur

- Static QR: URL/teks/WiFi/vCard, warna, logo tengah, ECC L/M/Q/H, export PNG/SVG
- Dynamic QR + short link: alias custom, expiry, edit target, hapus
- Redirect `/r/:slug` + counter klik + log scan (device, UA, IP)
- Dashboard: list link, grafik scan 7 hari, 30 scan terakhir
- Keamanan: rate limit 20 create/jam/user, blocklist domain
- Auth: email + password (Supabase)

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
   (Settings → API; anon = publishable key). Opsional: `NEXT_PUBLIC_SHORT_DOMAIN`.
4. Migrasi DB (butuh [Supabase CLI](https://supabase.com/docs/guides/cli)):
   ```bash
   npx supabase link --project-ref <REF>
   npx supabase db push --remote --yes --include-all
   ```
   Alternatif tanpa CLI: jalankan `supabase/schema.sql` + file di
   `supabase/migrations/` satu-satu di SQL Editor.
5. Supabase Auth: pastikan provider **Email** ON. Confirm email OFF untuk dev, ON untuk prod.
6. Jalankan:
   ```bash
   npm run dev -- -p 3002
   ```
   Buka `http://localhost:3002`, daftar akun, pakai.

## Deploy (Vercel)

Import repo → set env yang sama → deploy. Tambahkan domain prod ke
Supabase Auth → URL Configuration (Site URL + Redirect `/auth/callback`).

## Struktur

- `src/app/(landing, login, dashboard, r/[slug], api/links)` — rute + API
- `src/components/` — form QR, tabel link, grafik, panel scan
- `src/lib/` — client Supabase, generator QR, slug, short domain
- `supabase/migrations/` — migrasi berurutan (CLI)

## Lisensi

MIT — bebas pakai, modif, hosting sendiri. Lihat `LICENSE`.
