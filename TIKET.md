# Backlog Tiket — QRGen

> GitHub Issues: [#1](https://github.com/yanguswiradana/qrcodegen/issues/1)–[#12](https://github.com/yanguswiradana/qrcodegen/issues/12) = T-01–T-12.
> T-13/T-14 parkir, belum dibuatkan issue.
> Aturan eksekusi: 1 tiket = 1 branch/commit, mandiri, selesai bila semua
> "Kriteria selesai" terpenuhi + `tsc` 0 + `eslint` 0 + `build` sukses.
> Urutan = prioritas. Estimasi: S (<1 jam), M (1–3 jam), L (>3 jam).
>
> Keputusan owner 2026-11-07 (diterapkan): A=10x salah/jam per slug, pesan
> netral; B=validasi prefix+ownership + RPC khusus API key; E=boleh rename
> dengan konfirmasi + warning QR lama mati; J=tabel sekarang cukup (<500
> link), T-06 ditunda sampai skala menuntut.
> Keputusan owner 2026-11-08 (diterapkan): D=negara dari header Vercel saja
> (gratis, kasar); F=embed PNG berlogo/frame di dalam SVG (QR tetap vektor);
> G=skrip `npm run smoke` ringan (Playwright bila regresi kejadian lagi).

## P0 — Wajib duluan (rusak / basi cepat)

### T-01 — Migrasi `middleware.ts` → `proxy.ts` (Next 16) ([#1](https://github.com/yanguswiradana/qrcodegen/issues/1))
- **Masalah**: Next 16 deprecated konvensi file `middleware`, tiap `dev`/`build`
  nongol warning. Di Next versi depan file ini bisa diabaikan total (= proteksi
  `/dashboard` jebol diam-diam).
- **Lingkup**: `src/middleware.ts` → `src/proxy.ts` sesuai
  `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`.
  Jangan ubah logika redirect.
- **Kriteria selesai**:
  - [ ] Warning deprecation hilang dari `dev` dan `build`.
  - [ ] Anon buka `/dashboard` → 307 ke `/login` (curl).
  - [ ] User login buka `/dashboard` → 200.
- **Estimasi**: S. **Depends**: tidak ada. **Risiko**: rendah.

### T-02 — Halaman khusus link kedaluwarsa (ganti redirect buta ke `/`) ([#2](https://github.com/yanguswiradana/qrcodegen/issues/2))
- **Masalah**: Link expired maupun slug salah sama-sama mental ke `/`.
  Pengunjung tidak tahu link-nya kedaluwarsa, mati, atau salah ketik.
- **Lingkup**: `src/app/r/[slug]/page.tsx` — bedakan: slug tak dikenal →
  `notFound()`; expired → halaman `LinkExpired` (tampilkan slug + tanggal
  expired + tombol "Buat punyamu" ke `/`). RPC `get_link_public` sudah
  mengembalikan `expires_at`, tak perlu migrasi DB.
- **Kriteria selesai**:
  - [ ] `/r/slug-acak` → 404, bukan redirect.
  - [ ] Link expired → halaman jelas, bukan landing.
  - [ ] Link valid → tetap 307 ke target.
- **Estimasi**: S. **Depends**: tidak ada.

### T-03 — Tampilkan `last_used_at` + tanggal buat di daftar API key ([#3](https://github.com/yanguswiradana/qrcodegen/issues/3))
- **Masalah**: Data `last_used_at`/`created_at` sudah diambil API tapi tidak
  ditampilkan — user tak tahu key mana yang aktif.
- **Lingkup**: `src/components/ApiKeys.tsx` saja, format `id-ID`.
- **Kriteria selesai**:
  - [ ] Tiap key tampil: prefix, nama, dibuat tanggal, terakhir dipakai
        ("belum pernah" bila null).
- **Estimasi**: S. **Depends**: tidak ada.

## P1 — Keamanan + skala (pilih sesuai bahasan A–C)

### T-04 — Rate limit tebakan password link (`verify_link_password`) ([#4](https://github.com/yanguswiradana/qrcodegen/issues/4))
- **Masalah**: Password link bisa ditebak tanpa batas via `?pw=`. SHA-256
  unsalted + tanpa limit = brute force offline/online memungkinkan.
- **Lingkup** (usulan, final setelah bahasan-A): RPC baru/extend
  `verify_link_password` hitung gagal per slug (tabel `rate_buckets` reuse,
  key `pw:<slug>`, mis. max 10/jam) → balas `false` + halaman gate tulis
  "terlalu banyak percobaan". Perlu 1 migrasi DB.
- **Kriteria selesai**:
  - [ ] 10x salah dalam 1 jam → terkunci sementara (uji via curl).
  - [ ] Password benar setelah window → terbuka lagi.
  - [ ] Tidak bocor apakah slug ada/tidak (timing sama).
- **Estimasi**: M. **Depends**: tidak ada. **Risiko**: sedang (DB).

### T-05 — Kunci `check_rate` agar anon tak bisa membakar kuota orang ([#5](https://github.com/yanguswiradana/qrcodegen/issues/5))
- **Masalah**: `check_rate` (`SECURITY DEFINER`, grant anon) menerima `p_key`
  bebas — siapa pun bisa spam `create:<uuid-korban>` dan mengunci user lain
  (butuh tahu UUID, tapi tetap lubang).
- **Lingkup** (usulan, final setelah bahasan-B): validasi `p_key` harus
  diawali `create:` + milik pemanggil, atau pindahkan pemanggilan rate limit
  ke dalam RPC terotentikasi. Perlu 1 migrasi DB.
- **Kriteria selesai**:
  - [ ] Anon panggil `check_rate` dengan key orang lain → ditolak/tak efek.
  - [ ] Alur create link normal tetap kena limit 20/jam.
- **Estimasi**: S–M. **Depends**: tidak ada. **Risiko**: sedang (DB).

### T-06 — Pagination + search sisi server untuk tabel link ([#6](https://github.com/yanguswiradana/qrcodegen/issues/6))
- **Masalah**: Sekarang client-side di atas 200 baris. Lewat 200 link,
  data lama tak terlihat; makin berat di HP.
- **Lingkup**: `LinksList` terima `q`/`page` (query string atau RPC baru
  `search_links` dengan `count`), `LinksTable` minta halaman per navigasi.
  Pertahankan bulk-delete (kirim daftar slug).
- **Kriteria selesai**:
  - [ ] 250 link dummy → semua bisa dicari & dibuka per halaman 10.
  - [ ] Bulk hapus lintas halaman tetap jalan.
- **Estimasi**: M. **Depends**: bahasan-J (target skala).

### T-07 — Rename slug (ganti alias setelah dibuat) ([#7](https://github.com/yanguswiradana/qrcodegen/issues/7))
- **Masalah**: Edit hanya target/expiry/password. Salah ketik alias =
  hapus + buat baru (scan lama hilang).
- **Lingkup**: `PATCH /api/links` terima `new_slug` (validasi `ALIAS_RE` +
  409 bila bentrok, update `qr_codes.payload` ikut), UI di `LinkRowActions`.
- **Kriteria selesai**:
  - [ ] Rename sukses → `/r/alias-baru` jalan, lama 404.
  - [ ] Bentrok → 409 + pesan jelas, tidak ada data berubah.
- **Estimasi**: M. **Depends**: bahasan-E.

## P2 — Fitur nilainya (pilih sesuai bahasan)

### T-08 — Unduh ZIP semua QR ([#8](https://github.com/yanguswiradana/qrcodegen/issues/8))
- **Masalah**: Unduh QR satu-satu melelahkan untuk puluhan link.
- **Lingkup**: Tombol di dashboard → generate PNG per slug di client
  (pakai `toPngDataUrl` yang ada) → zip via `jszip` (dependency baru) →
  unduh `qr-bulk.zip`. Tanpa perubahan API/DB.
- **Kriteria selesai**:
  - [ ] 20 link → 1 zip berisi 20 PNG bernama `qr-<slug>.png`.
  - [ ] Ada progres selama generate.
- **Estimasi**: M. **Depends**: tidak ada (pure client).

### T-09 — Analitik negara + browser ([#9](https://github.com/yanguswiradana/qrcodegen/issues/9))
- **Masalah**: `country` selalu null, `device` cuma mobile/tablet/desktop.
- **Lingkup**: Isi `country` dari header (Vercel: `x-vercel-ip-country`) +
  parse browser dari UA di `track()` + tampilkan breakdown di `ScansPanel`
  dan halaman `/s`. Tanpa GeoIP mandiri.
- **Kriteria selesai**:
  - [ ] Scan baru tercatat dengan country + browser.
  - [ ] Panel + halaman publik tampilkan breakdown-nya.
- **Estimasi**: M. **Depends**: bahasan-D (sumber GeoIP).

### T-10 — Samakan output SVG dengan PNG (logo + frame) ([#10](https://github.com/yanguswiradana/qrcodegen/issues/10))
- **Masalah**: Unduhan SVG polos — tanpa logo/frame yang terlihat di preview.
  User mengira file rusak/beda.
- **Lingkup** (final setelah bahasan-F): opsi A — embed PNG berlogo sebagai
  `<image>` dalam SVG; opsi B — hapus tombol SVG bila berlogo + beri alasan.
- **Kriteria selesai**: sesuai opsi terpilih, preview == hasil unduh.
- **Estimasi**: S–M. **Depends**: bahasan-F.

### T-11 — SEO + OG image landing ([#11](https://github.com/yanguswiradana/qrcodegen/issues/11))
- **Masalah**: Title/deskripsi generik, tanpa OG image — jelek saat
  link demo disebar (portfolio!).
- **Lingkup**: `metadata` lengkap (OG/Twitter, canonical demo URL) +
  1 file `opengraph-image` statis (bisa diekspor dari preview QR).
- **Kriteria selesai**:
  - [ ] `curl` halaman kirim meta OG lengkap + image 1200x630.
- **Estimasi**: S. **Depends**: tidak ada.

### T-12 — Tes asap otomatis (smoke test) ([#12](https://github.com/yanguswiradana/qrcodegen/issues/12))
- **Masalah**: Regresi (redirect mati, RPC 42883) pernah lolos tanpa sadar.
  Semua verifikasi selama ini manual via curl.
- **Lingkup** (final setelah bahasan-G): skrip `npm run smoke` (Node fetch
  ke dev server: landing 200, dashboard 307, API 401, `/r` unknown 307/404
  sesuai T-02) ATAU Playwright minimal. Tanpa framework berat bila opsi skrip.
- **Kriteria selesai**:
  - [ ] `npm run smoke` hijau; gagal bila salah satu rute menyimpang.
- **Estimasi**: S (skrip) / M (Playwright). **Depends**: T-02 (kode status).

## P3 — Kapan-kapan / bila diminta

### T-13 — Export + hapus akun (privasi untuk user self-host)
- Export CSV semua link+scan, hapus akun + cascade. Estimasi M.
  Butuh bahasan: apakah perlu untuk portfolio/demo?

### T-14 — Bilingual ID/EN
- Estimasi M–L. Butuh bahasan-I. Jangan mulai sebelum diputuskan.

---

## Daftar ambiguitas — untuk dibahas (bukan ditebak)

| ID | Pertanyaan | Rekomendasi saya | Tiket terkait |
|----|-----------|------------------|---------------|
| A | Password link dibatasi berapa kali coba? Blokir berapa lama? | 10x/jam per slug, pesan netral (tanpa bocorkan info) | T-04 |
| B | `check_rate` diketatkan seberapa jauh? | Validasi prefix + ownership di RPC, anon tetap bisa rate-limit dirinya sendiri | T-05 |
| C | Slug salah vs expired: 404 vs halaman khusus vs tetap redirect `/`? | Slug salah → 404; expired → halaman khusus (T-02) | T-02 |
| D | Analitik negara: pakai header Vercel saja (gratis, kasar) atau GeoIP beneran? | Header Vercel cukup untuk portfolio | T-09 |
| E | Slug boleh diganti (rename) atau immutable selamanya? | Boleh, dengan konfirmasi + warning QR lama mati | T-07 |
| F | SVG berlogo: embed PNG di dalam SVG, atau tombol SVG disembunyikan saat berlogo? | Embed (satu file, tetap vektor frame-nya) | T-10 |
| G | Investasi tes: skrip smoke ringan atau Playwright? | Skrip `npm run smoke` dulu, Playwright bila regresi kejadian lagi | T-12 |
| H | Domain short custom: serius dipakai atau cukup di QR download? | Serius → redirect `/r` harus hormati domain (tiket baru) | — |
| I | Bahasa UI tetap Indonesia saja? | Ya, ID saja (audiens + owner ID; EN gandakan maintenance) | T-14 |
| J | Target skala per user (link & scan)? | <500 link, <10rb scan/bln → T-06 model sekarang cukup, server-side bila lewat | T-06 |
| K | Freemium tetap 3x localStorage + login disembunyikan? | Tetap (sesuai keputusan produk), server-side gate hanya bila ada abuse nyata | — |
| L | Retensi data scan: simpan selamanya atau auto-hapus >X bulan? | Auto-hapus >12 bulan via cron (tiket baru, kecil) | — |
