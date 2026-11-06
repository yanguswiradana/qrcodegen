# QRGen — QR Code + Short Link (self-hostable)

QR generator + short link satu dashboard. Static QR instan, dynamic QR via redirect `/r/:slug` dengan tracking scan. Stack: Next.js 16 + Supabase (Postgres + Auth).

Live demo (portfolio): https://qrcodegen-arxcode.vercel.app/

## Fitur

- Static QR: URL/teks/WiFi/vCard, warna, logo tengah, frame + caption,
  ECC L/M/Q/H, export PNG 256/512/1024 + SVG
- Dynamic QR + short link: alias custom, expiry, password link, edit target, hapus
- Redirect `/r/:slug` + counter klik + log scan (device, UA, IP)
- Public stats `/s/:slug` — halaman scan publik per link
- Dashboard: list link (gembok + stats), bulk CSV 100/batch, grafik 7 hari, 30 scan terakhir
- Keamanan: rate limit 20 create/jam/user, blocklist domain
- API: key per user (`Authorization: Bearer qrgen_...`), POST/GET /api/links
- Freemium: landing 3x QR anonim (localStorage), login = unlimited
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
