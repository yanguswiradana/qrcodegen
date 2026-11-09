// Smoke test ringan (tiket T-12, keputusan G).
// Jalankan saat dev server hidup:  BASE_URL=http://localhost:3002 npm run smoke
// Keluar non-zero + pesan jelas bila ada rute menyimpang.

const BASE = (process.env.BASE_URL ?? "http://localhost:3002").replace(/\/$/, "");

let failed = 0;

async function check(label, url, opts, expect) {
  let res;
  try {
    res = await fetch(BASE + url, { redirect: "manual", ...opts });
  } catch (e) {
    console.log(`FAIL ${label}: koneksi gagal (${e.cause?.code ?? e.message}) — dev server jalan?`);
    failed++;
    return;
  }
  const ok = await expect(res);
  console.log(`${ok ? "ok  " : "FAIL"} ${label}: ${res.status}`);
  if (!ok) failed++;
}

const locationIs = (prefix) => (res) =>
  res.status >= 300 &&
  res.status < 400 &&
  (res.headers.get("location") ?? "").startsWith(prefix);

await check("landing /", "/", {}, (r) => r.status === 200);
await check("login", "/login", {}, (r) => r.status === 200);
await check("dashboard anon -> /login", "/dashboard", {}, locationIs("/login"));
await check(
  "landing EN (cookie)",
  "/",
  { headers: { cookie: "qrgen_locale=en" } },
  async (r) => r.status === 200 && (await r.text()).includes("one place")
);
await check(
  "POST /api/links tanpa auth -> 401 (ID)",
  "/api/links",
  { method: "POST", headers: { "content-type": "application/json" }, body: "{}" },
  async (r) =>
    r.status === 401 && (await r.text()).includes("Login dulu")
);
await check(
  "POST /api/links tanpa auth -> 401 (EN)",
  "/api/links",
  {
    method: "POST",
    headers: { "content-type": "application/json", cookie: "qrgen_locale=en" },
    body: "{}",
  },
  async (r) =>
    r.status === 401 && (await r.text()).includes("Please sign in first")
);
await check("slug asing -> 404", "/r/smoke-tidak-ada-xyz", {}, (r) => r.status === 404);
await check("stats asing -> 404", "/s/smoke-tidak-ada-xyz", {}, (r) => r.status === 404);
await check("OG image", "/opengraph-image.png", {}, (r) => r.status === 200);

if (failed > 0) {
  console.log(`\n${failed} cek GAGAL`);
  process.exit(1);
}
console.log("\nsemua cek LOLOS");
