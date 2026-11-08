import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/locale-server";
import { dateLocale, tx } from "@/lib/i18n";

type Stats = {
  slug: string;
  target_url: string;
  clicks: number;
  created_at: string;
  by_device: Record<string, number>;
  daily: Record<string, number>;
  by_country: Record<string, number>;
  by_browser: Record<string, number>;
};

export default async function StatsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const locale = await getLocale();
  const t = (k: Parameters<typeof tx>[1]) => tx(locale, k);
  const dl = dateLocale(locale);
  const supabase = await createClient();
  const { data } = await supabase.rpc("link_stats", { p_slug: slug });

  const row = (Array.isArray(data) ? data[0] : null) as Stats | null;
  if (!row) notFound();

  const days: { label: string; key: string; count: number }[] = [];
  // Dibaca sekali per render request — stabil selama render ini.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now - i * 864e5);
    const key = d.toISOString().slice(0, 10);
    days.push({
      key,
      label: d.toLocaleDateString(dl, { day: "numeric", month: "short" }),
      count: row.daily?.[key] ?? 0,
    });
  }
  const max = Math.max(1, ...days.map((d) => d.count));
  const devices = Object.entries(row.by_device ?? {});
  const countries = Object.entries(row.by_country ?? {});
  const browsers = Object.entries(row.by_browser ?? {});

  function breakdownLine(label: string, entries: [string, number][]) {
    if (entries.length === 0) return null;
    return (
      <p className="mt-1 text-xs text-zinc-400">
        {label}: {entries.map(([k, v]) => `${k} ${v}`).join(" · ")}
      </p>
    );
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <p className="font-mono text-sm text-zinc-400">/r/{row.slug}</p>
      <h1 className="mt-1 text-3xl font-bold">
        {locale === "en"
          ? `${row.clicks} scan${row.clicks === 1 ? "" : "s"}`
          : `${row.clicks} scan`}
      </h1>
      <p className="mt-1 truncate text-sm text-zinc-400">{row.target_url}</p>
      <p className="mt-1 text-xs text-zinc-400">
        {t("createdOn")} {new Date(row.created_at).toLocaleDateString(dl)}
        {devices.length > 0 &&
          " · " + devices.map(([k, v]) => `${k}: ${v}`).join(" · ")}
      </p>
      {breakdownLine(t("byBrowser"), browsers)}
      {breakdownLine(t("byCountry"), countries)}

      <div className="mt-6 flex h-28 items-end gap-2">
        {days.map((d) => (
          <div key={d.key} className="flex flex-1 flex-col items-center gap-1">
            <span className="font-mono text-xs">{d.count}</span>
            <div
              className="w-full rounded-t bg-[var(--accent)]"
              style={{ height: `${Math.max(4, (d.count / max) * 90)}px` }}
            />
            <span className="text-[11px] text-zinc-400">{d.label}</span>
          </div>
        ))}
      </div>

      <div className="mt-8 flex gap-3 text-sm">
        <a href={`/r/${row.slug}`} className="qr-btn">
          {t("openLink")}
        </a>
        <Link href="/" className="qr-btn-ghost">
          {t("makeYours")}
        </Link>
      </div>
      <p className="mt-6 text-xs text-zinc-400">{t("madeWith")}</p>
    </main>
  );
}
