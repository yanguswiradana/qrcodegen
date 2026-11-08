import { createClient } from "@/lib/supabase/server";

export default async function ScansPanel() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("scans")
    .select("source, device, browser, country, user_agent, created_at, links(slug)")
    .order("created_at", { ascending: false })
    .limit(30);

  const rows = data ?? [];
  if (rows.length === 0) {
    return <p className="mt-4 text-sm text-zinc-400">Belum ada scan.</p>;
  }

  function breakdown(get: (r: (typeof rows)[number]) => string) {
    const m: Record<string, number> = {};
    for (const r of rows) m[get(r)] = (m[get(r)] ?? 0) + 1;
    return Object.entries(m)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k}: ${v}`)
      .join(" · ");
  }

  const byDevice = breakdown((r) => r.device ?? "unknown");
  const byBrowser = breakdown((r) => r.browser ?? "unknown");
  const byCountry = breakdown((r) => r.country ?? "unknown");

  return (
    <div className="mt-4">
      <p className="text-sm text-zinc-400">
        30 scan terakhir
      </p>
      <p className="mt-1 text-xs text-zinc-500">
        Device — {byDevice}
        <br />
        Browser — {byBrowser}
        <br />
        Negara — {byCountry}
      </p>
      <div className="mt-2 overflow-x-auto qr-card">
        <table className="w-full text-sm qr-table">
          <thead>
            <tr className="text-left">
              <th>Slug</th>
              <th>Device</th>
              <th>Browser</th>
              <th>Negara</th>
              <th>Waktu</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="font-mono">
                  {(r.links as unknown as { slug: string } | null)?.slug ?? "-"}
                </td>
                <td>{r.device ?? "-"}</td>
                <td>{r.browser ?? "-"}</td>
                <td>{r.country ?? "-"}</td>
                <td className="max-w-48 truncate text-xs">
                  {new Date(r.created_at).toLocaleString("id-ID")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
