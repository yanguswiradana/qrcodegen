# QRGen — QR Code + Short Link (self-hostable)

> Versi Indonesia: [README.md](README.md).

QR generator + short links in one dashboard. Instant static QR, dynamic QR via
redirect `/r/:slug` with scan tracking. Stack: Next.js 16 + Supabase
(Postgres + Auth).

Live demo (portfolio): https://qrcodegen-arxcode.vercel.app/

## Features

- Static QR: URL/text/WiFi/vCard, colors, center logo (contain-fit, auto ECC H),
  frame + caption, ECC L/M/Q/H, export PNG 256/512/1024 + SVG (SVG = preview)
- Dynamic QR + short link: custom alias (renamable), expiry (dedicated expired
  page, unknown slugs → 404), link password (10 tries/hour rate limit), edit
  target, delete
- Redirect `/r/:slug` + click counter + scan log (device, browser, country, UA)
- Public stats `/s/:slug` — public scan page per link (7-day chart,
  device/browser/country breakdown)
- Dashboard: search + pagination + bulk delete + download-all-ZIP,
  bulk CSV 100/batch (pre-validated), 7-day chart, last 30 scans,
  section navigation
- Security: 20 creates/hour/user rate limit, domain blocklist, RLS own-data,
  public/privileged operations via `SECURITY DEFINER` RPCs
- API: per-user key (`Authorization: Bearer qrgen_...`), POST/GET/PATCH/DELETE
  `/api/links`, CRUD `/api/keys` (see [API docs](#api))
- Freemium: landing 3x anonymous QR per 6 hours (localStorage, auto-refresh + countdown), login = unlimited
- Auth: email + password (Supabase)
- Bilingual ID/EN (toggle, stored in cookie)
- Account: CSV export (links + scans), delete account + all data (double confirm)

## API

Local base URL: `http://localhost:3002`. Dual auth per request:

- Login session (browser cookie), or
- Header `Authorization: Bearer qrgen_...` (create a key in dashboard → API keys;
  the key is shown once, prefix `qrgen_xxx...` as identifier).

Rate limits: **20 creates/hour per user** (429 when exceeded), **10 wrong
passwords/hour per slug** (temporarily locked, neutral message).

### `POST /api/links` — create a link

```bash
curl -X POST http://localhost:3002/api/links \
  -H "Authorization: Bearer qrgen_..." \
  -H "Content-Type: application/json" \
  -d '{"target_url":"https://example.com/promo","alias":"promo","expires_at":"2027-01-01T00:00:00Z","password":"secret"}'
# -> {"slug":"promo"}   (no alias: random 7-char slug)
```

`expires_at` / `password` optional. Errors: `400` invalid URL/alias/expiry,
`403` blocked domain, `409` alias taken, `429` limit, `401` bad key.

### `GET /api/links` — list links (supports `q`, `page`, `per_page`)

```bash
curl "http://localhost:3002/api/links?q=promo&per_page=10&page=1" -H "Authorization: Bearer qrgen_..."
# -> {"links":[{"slug":"promo","target_url":"...","clicks":3,"expires_at":null,"created_at":"..."}],"total":1}
```

### `PATCH /api/links` — edit (login session only)

```bash
curl -X PATCH http://localhost:3002/api/links \
  --cookie "sb-<ref>-auth-token.0=..." \
  -H "Content-Type: application/json" \
  -d '{"slug":"promo","target_url":"https://example.com/new","new_slug":"promo25","expires_at":null,"password":""}'
```

`new_slug` optional (validated + 409 on conflict, old QR dies with it).
`password: ""` removes the password, `expires_at: null` removes expiry.

### `DELETE /api/links?slug=promo` — delete (login session only)

### `GET/POST/DELETE /api/keys` — manage API keys (login session only)

```bash
curl -X POST http://localhost:3002/api/keys \
  --cookie "sb-<ref>-auth-token.0=..." \
  -H "Content-Type: application/json" -d '{"name":"ci"}'
# -> {"api_key":"qrgen_...","prefix":"qrgen_..."}   # copy now!
```

### `GET /api/account/export?kind=links|scans` — download CSV (login session only)

### `DELETE /api/account` — delete ALL data + account (login session only)

Double confirm in the dashboard. The auth row is also deleted when
`SUPABASE_SERVICE_ROLE_KEY` is configured.

## Self-host (5 minutes)

1. Clone + install:
   ```bash
   git clone https://github.com/yanguswiradana/qrcodegen
   cd qrcodegen
   npm install
   ```
2. Create a project at [Supabase](https://supabase.com) (free tier is enough).
3. Copy env:
   ```bash
   cp .env.example .env.local
   ```
   Fill `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   (Settings → API; anon = publishable key).
4. Migrate the DB (needs [Supabase CLI](https://supabase.com/docs/guides/cli)):
   ```bash
   npx supabase link --project-ref <REF>
   npx supabase db push --remote --yes --include-all
   ```
   18 migrations in `supabase/migrations/` (rate limit, stats, password, API
   keys, expiry, public redirect, analytics, purge, pagination…). Without the
   CLI: run the migration files one by one in the SQL Editor **in order**.
5. Supabase Auth: make sure the **Email** provider is ON. Confirm email OFF for dev, ON for prod.
6. Run:
   ```bash
   npm run dev -- -p 3002
   ```
   Open `http://localhost:3002`, sign up, use it.

## Deploy (Vercel)

Import repo → set the same env → deploy. Add the prod domain to
Supabase Auth → URL Configuration (Site URL + Redirect `/auth/callback`).
Country analytics uses the `x-vercel-ip-country` header (automatic on Vercel).

Optional — automatic scan purge (daily cron at 03:00 UTC, deletes scans
older than 3 months; total clicks unaffected). Without these env vars the cron
answers 503 and data is untouched:

- `CRON_SECRET` — any random string (Vercel sends it automatically as
  `Authorization` to the cron).
- `SUPABASE_SERVICE_ROLE_KEY` — Settings → API → `service_role`.
  **Secret**: never use a `NEXT_PUBLIC_` prefix, never commit.

## Dev

```bash
npm run dev -- -p 3002   # dev (port 3002, used by sibling projects)
npm run build            # production build
npm run smoke            # 9 route + locale checks against BASE_URL (default localhost:3002)
npx tsc --noEmit && npx eslint src/   # must be 0 before commit
```

Note for the next session: read [DEVELOPER_NOTES.md](DEVELOPER_NOTES.md)
(architecture, migration flow, bug lessons; Indonesian) and [TIKET.md](TIKET.md)
(backlog, Indonesian).

## Structure

- `src/app/(page, login, dashboard, r/[slug], s/[slug], api/*)` — routes + API
- `src/proxy.ts` — `/dashboard` protection (Next 16: `proxy`, not `middleware`)
- `src/components/` — QR forms, link table (+ZIP), charts, scan panel
- `src/lib/` — Supabase client, QR generator (`toFancySvg`), slug, short domain
- `supabase/migrations/` — 18 sequential migrations (CLI)
- `scripts/smoke.mjs` — smoke test

## License

MIT — free to use, modify, self-host. See `LICENSE`.
