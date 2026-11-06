import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function StatsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: link } = await supabase
    .from("links")
    .select("id, slug, target_url, clicks, created_at")
    .eq("slug", slug)
    .single();

  if (!link) notFound();

  const { data: scans } = await supabase
    .from("scans")
    .select("device, created_at")
    .eq("link_id", link.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = scans ?? [];
  const byDevice: Record<string, number> = {};
  for (const s of rows) byDevice[s.device ?? "?"] = (byDevice[s.device ?? "?"] ?? 0) + 1;

  const days: { label: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 864e5);
    days.push({ label: d.toLocaleDateString("id-ID", { day: "numeric", month: "short" }), count: 0 });
  }
  for (const s of rows) {
    const idx = 6 - Math.floor((Date.now() - new Date(s.created_at).getTime()) / 864e5);
    if (idx >= 0 && idx < 7) days[idx].count++;
  }
  const max = Math.max(1, ...days.map((d) => d.count));

  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <p className="font-mono text-sm text-zinc-500">/r/{link.slug}</p>
      <h1 className="mt-1 text-3xl font-bold">{link.clicks} scan</h1>
      <p className="mt-1 truncate text-sm text-zinc-600">{link.target_url}</p>
      <p className="mt-1 text-xs text-zinc-500">
        Dibuat {new Date(link.created_at).toLocaleDateString("id-ID")} ·{" "}
        {Object.entries(byDevice).map(([k, v]) => `${k}: ${v}`).join(" · ") || "belum ada data device"}
      </p>

      <div className="mt-6 flex h-28 items-end gap-2">
        {days.map((d) => (
          <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
            <span className="font-mono text-xs">{d.count}</span>
            <div
              className="w-full rounded-t bg-black"
              style={{ height: `${Math.max(4, (d.count / max) * 90)}px` }}
            />
            <span className="text-[11px] text-zinc-500">{d.label}</span>
          </div>
        ))}
      </div>

      <div className="mt-8 flex gap-3 text-sm">
        <a
          href={`/r/${link.slug}`}
          className="rounded bg-black px-4 py-2 text-white"
        >
          Buka link
        </a>
        <Link href="/" className="rounded border px-4 py-2">
          Buat punyamu
        </Link>
      </div>
      <p className="mt-6 text-xs text-zinc-500">
        Dibuat dengan QRGen — self-hostable (MIT).
      </p>
    </main>
  );
}
