"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Row = {
  url: string;
  alias: string;
  ok?: boolean;
  slug?: string;
  error?: string;
  /** Gagal pra-validasi client: dilewati, tidak memakan kuota rate limit. */
  invalid?: boolean;
};

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

function parseCsv(text: string): { rows: Row[]; truncated: number } {
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
      r.error = "URL kosong";
    } else if (!validUrl(r.url)) {
      r.invalid = true;
      r.error = "URL tidak valid (butuh http(s)://)";
    } else if (seenUrl.has(r.url.toLowerCase())) {
      r.invalid = true;
      r.error = "Duplikat di file";
    } else if (r.alias && !ALIAS_RE.test(r.alias)) {
      r.invalid = true;
      r.error = "Alias 3-32 char: huruf, angka, - _";
    } else if (r.alias && seenAlias.has(r.alias.toLowerCase())) {
      r.invalid = true;
      r.error = "Alias duplikat di file";
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
      const { rows, truncated } = parseCsv(String(reader.result));
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
        out[i] = { ...out[i], ok: false, error: "Network" };
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
      `Selesai: ${okCount} berhasil, ${failCount} gagal` +
        (skipCount > 0 ? `, ${skipCount} dilewati (tidak valid)` : "") +
        "."
    );
    router.refresh();
  }

  return (
    <div className="qr-card p-5">
      <h2 className="font-semibold">Bulk create (CSV)</h2>
      <p className="mt-1 text-xs text-zinc-400">
        Format: url,alias (baris pertama boleh header). Max {MAX_ROWS}{" "}
        baris/batch. Rate limit 20/jam tetap berlaku — baris tidak valid
        ditandai sebelum dikirim agar tidak memakan kuota.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="qr-file text-sm">
          <input type="file" accept=".csv,.txt" onChange={onFile} />
          {rows.length > 0 ? "Ganti file" : "Pilih CSV"}
        </label>
        {validCount > 0 && (
          <button
            onClick={run}
            disabled={running}
            className="qr-btn text-sm disabled:opacity-50"
          >
            {running
              ? `${done}/${validCount}...`
              : `Buat ${validCount} link`}
          </button>
        )}
      </div>
      {truncated > 0 && (
        <p className="mt-2 text-xs text-amber-400">
          File melebihi {MAX_ROWS} baris — {truncated} baris terakhir
          diabaikan. Pecah jadi beberapa file.
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
                        dilewati: {r.error}
                      </span>
                    ) : r.ok === undefined ? (
                      <span className="text-zinc-400">antre</span>
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
