"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/LocaleProvider";
import type { MsgKey } from "@/lib/i18n";

type Row = { url: string; alias: string; ok?: boolean; slug?: string; error?: string; invalid?: boolean };
type T = (key: MsgKey, vars?: Record<string, string | number>) => string;

const ALIAS_RE = /^[a-zA-Z0-9_-]{3,32}$/;
const MAX_ROWS = 100;

function validUrl(u: string): boolean {
  try {
    const p = new URL(u);
    return p.protocol === "http:" || p.protocol === "https:";
  } catch {
    return false;
  }
}

/** Header hanya bila baris PERTAMA diawali kata url/target/link sebelum delimiter. */
function isHeader(line: string): boolean {
  return /^\s*(url|target|link)\s*[,;]/i.test(line);
}

function parseCsv(text: string, t: T): { rows: Row[]; truncated: number } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length > 0 && isHeader(lines[0])) lines.shift();

  const truncated = Math.max(0, lines.length - MAX_ROWS);
  const rows: Row[] = lines.slice(0, MAX_ROWS).map((l) => {
    const [url = "", alias = ""] = l
      .split(/[,;]/)
      .map((s) => s.trim().replace(/^"|"$/g, ""));
    return { url, alias };
  });

  // Pra-validasi + tandai duplikat dalam file (hemat kuota 20/jam).
  const seenUrl = new Set<string>();
  const seenAlias = new Set<string>();
  for (const r of rows) {
    if (!r.url) {
      r.invalid = true;
      r.error = t("errEmptyUrl");
    } else if (!validUrl(r.url)) {
      r.invalid = true;
      r.error = t("errBadUrl");
    } else if (seenUrl.has(r.url.toLowerCase())) {
      r.invalid = true;
      r.error = t("errDupUrl");
    } else if (r.alias && !ALIAS_RE.test(r.alias)) {
      r.invalid = true;
      r.error = t("errBadAlias");
    } else if (r.alias && seenAlias.has(r.alias.toLowerCase())) {
      r.invalid = true;
      r.error = t("errDupAlias");
    }
    if (!r.invalid) {
      seenUrl.add(r.url.toLowerCase());
      if (r.alias) seenAlias.add(r.alias.toLowerCase());
    }
  }
  return { rows, truncated };
}

export default function BulkCreate() {
  const router = useRouter();
  const t = useT();
  const [rows, setRows] = useState<Row[]>([]);
  const [truncated, setTruncated] = useState(0);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [summary, setSummary] = useState("");

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const { rows, truncated } = parseCsv(String(reader.result), t);
      setRows(rows);
      setTruncated(truncated);
      setDone(0);
      setSummary("");
    };
    reader.readAsText(f);
    e.target.value = "";
  }

  const validCount = rows.filter((r) => !r.invalid).length;

  async function run() {
    if (running || validCount === 0) return;
    setRunning(true);
    setDone(0);
    setSummary("");
    const out = [...rows];
    let n = 0;
    for (let i = 0; i < out.length; i++) {
      if (out[i].invalid) continue;
      try {
        const res = await fetch("/api/links", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            target_url: out[i].url,
            alias: out[i].alias || undefined,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          out[i] = { ...out[i], ok: true, slug: data.slug };
        } else {
          out[i] = { ...out[i], ok: false, error: data.error ?? `HTTP ${res.status}` };
        }
      } catch {
        out[i] = { ...out[i], ok: false, error: t("network") };
      }
      n++;
      setRows([...out]);
      setDone(n);
    }
    setRunning(false);
    const okCount = out.filter((r) => r.ok).length;
    const failCount = out.filter((r) => r.ok === false && !r.invalid).length;
    const skipCount = out.filter((r) => r.invalid).length;
    setSummary(
      t("doneSummary", { ok: okCount, fail: failCount }) +
        (skipCount > 0 ? t("skipSuffix", { n: skipCount }) : "") +
        "."
    );
    router.refresh();
  }

  return (
    <div className="qr-card p-5">
      <h2 className="font-semibold">{t("bulkTitle")}</h2>
      <p className="mt-1 text-xs text-zinc-400">
        {t("bulkDesc", { max: MAX_ROWS })}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="qr-file text-sm">
          <input type="file" accept=".csv,.txt" onChange={onFile} />
          {rows.length > 0 ? t("changeFile") : t("pickFile")}
        </label>
        {validCount > 0 && (
          <button
            onClick={run}
            disabled={running}
            className="qr-btn text-sm disabled:opacity-50"
          >
            {running
              ? t("running", { done, total: validCount })
              : t("makeLinks", { n: validCount })}
          </button>
        )}
      </div>
      {truncated > 0 && (
        <p className="mt-2 text-xs text-amber-400">
          {t("truncated", { max: MAX_ROWS, n: truncated })}
        </p>
      )}
      {summary && <p className="mt-2 text-xs text-zinc-400">{summary}</p>}
      {rows.length > 0 && (
        <div className="mt-3 max-h-64 overflow-y-auto text-xs">
          <table className="qr-table w-full">
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className="max-w-48 truncate p-1">{r.url || "-"}</td>
                  <td className="p-1 font-mono">{r.alias || "-"}</td>
                  <td className="p-1">
                    {r.invalid ? (
                      <span className="text-amber-400">
                        {t("statusSkipped")}: {r.error}
                      </span>
                    ) : r.ok === undefined ? (
                      <span className="text-zinc-400">{t("statusQueue")}</span>
                    ) : r.ok ? (
                      <span className="text-green-400">/r/{r.slug}</span>
                    ) : (
                      <span className="text-red-400">{r.error}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
