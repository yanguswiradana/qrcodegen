import { createClient } from "@/lib/supabase/server";
import { getLocale } from "@/lib/locale-server";
import { dateLocale, tx } from "@/lib/i18n";

export default async function ScansPanel() {
  const locale = await getLocale();
  const t = (k: Parameters<typeof tx>[1]) => tx(locale, k);
  const supabase = await createClient();
  const { data } = await supabase
    .from("scans")
    .select("source, device, browser, country, user_agent, created_at, links(slug)")
    .order("created_at", { ascending: false })
    .limit(30);

  const rows = data ?? [];
  if (rows.length === 0) {
    return <p className="mt-4 text-sm text-zinc-400">{t("noScans")}</p>;
  }

  function breakdown(get: (r: (typeof rows)[number]) => string) {
    const m: Record<string, number> = {};
    for (const r of rows) m[get(r)] = (m[get(r)] ?? 0) + 1;
    return Object.entries(m)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k}: ${v}`)
      .join(" · ");
  }

  const byDevice = breakdown((r) => r.device ?? t("unknown"));
  const byBrowser = breakdown((r) => r.browser ?? t("unknown"));
  const byCountry = breakdown((r) => r.country ?? t("unknown"));

  return (
    <div className="mt-4">
      <p className="text-sm text-zinc-400">{t("recentScans")}</p>
      <p className="mt-1 text-xs text-zinc-400">
        {t("byDevice")} — {byDevice}
        <br />
        {t("byBrowser")} — {byBrowser}
        <br />
        {t("byCountry")} — {byCountry}
      </p>
      <div className="mt-2 overflow-x-auto qr-card">
        <table className="w-full text-sm qr-table">
          <thead>
            <tr className="text-left">
              <th>{t("colSlug")}</th>
              <th>{t("colDevice")}</th>
              <th>{t("colBrowser")}</th>
              <th>{t("colCountry")}</th>
              <th>{t("colTime")}</th>
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
                  {new Date(r.created_at).toLocaleString(dateLocale(locale))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
