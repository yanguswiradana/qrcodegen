import { createClient } from "@/lib/supabase/server";

export default async function ScansChart() {
  const supabase = await createClient();
  // Dibaca sekali per render request — stabil selama render ini.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const { data } = await supabase
    .from("scans")
    .select("created_at")
    .gte("created_at", new Date(now - 7 * 864e5).toISOString())
    .order("created_at", { ascending: true })
    .limit(5000);

  const days: { label: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now - i * 864e5);
    days.push({
      label: d.toLocaleDateString("id-ID", { weekday: "short" }),
      count: 0,
    });
  }
  for (const s of data ?? []) {
    const idx = 6 - Math.floor((now - new Date(s.created_at).getTime()) / 864e5);
    if (idx >= 0 && idx < 7) days[idx].count++;
  }
  const max = Math.max(1, ...days.map((d) => d.count));

  return (
    <div className="mt-4 qr-card p-5">
      <h3 className="text-lg font-semibold">Scan 7 hari</h3>
      <div className="mt-3 flex h-28 items-end gap-2">
        {days.map((d) => (
          <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-xs font-mono">{d.count}</span>
            <div
              className="w-full rounded-t bg-[var(--accent)]"
              style={{ height: `${Math.max(4, (d.count / max) * 90)}px` }}
            />
            <span className="text-[11px] text-zinc-400">{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
