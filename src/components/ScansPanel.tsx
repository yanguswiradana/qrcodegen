import { createClient } from "@/lib/supabase/server";

export default async function ScansPanel() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("scans")
    .select("source, device, user_agent, created_at, links(slug)")
    .order("created_at", { ascending: false })
    .limit(30);

  const rows = data ?? [];
  if (rows.length === 0) {
    return <p className="mt-4 text-sm text-zinc-500">Belum ada scan.</p>;
  }

  const byDevice: Record<string, number> = {};
  for (const r of rows) byDevice[r.device ?? "unknown"] = (byDevice[r.device ?? "unknown"] ?? 0) + 1;

  return (
    <div className="mt-4">
      <p className="text-sm text-zinc-600">
        30 scan terakhir — {Object.entries(byDevice).map(([k, v]) => `${k}: ${v}`).join(" · ")}
      </p>
      <div className="mt-2 overflow-x-auto rounded border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-50 text-left">
              <th className="p-2">Slug</th>
              <th className="p-2">Device</th>
              <th className="p-2">Waktu</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t">
                <td className="p-2 font-mono">
                  {(r.links as unknown as { slug: string } | null)?.slug ?? "-"}
                </td>
                <td className="p-2">{r.device ?? "-"}</td>
                <td className="max-w-48 truncate p-2 text-xs">
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
