"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Row = { url: string; alias: string; ok?: boolean; slug?: string; error?: string };

function parseCsv(text: string): Row[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !l.toLowerCase().startsWith("url"))
    .slice(0, 100)
    .map((l) => {
      const [url = "", alias = ""] = l.split(/[,;]/).map((s) => s.trim());
      return { url, alias };
    });
}

export default function BulkCreate() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setRows(parseCsv(String(reader.result)));
    reader.readAsText(f);
  }

  async function run() {
    setRunning(true);
    setDone(0);
    const out = [...rows];
    for (let i = 0; i < out.length; i++) {
      try {
        const res = await fetch("/api/links", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ target_url: out[i].url, alias: out[i].alias || undefined }),
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
      setRows([...out]);
      setDone(i + 1);
      router.refresh();
    }
    setRunning(false);
  }

  return (
    <div className="qr-card p-5">
      <h2 className="font-semibold">Bulk create (CSV)</h2>
      <p className="mt-1 text-xs text-zinc-400">
        Format: url,alias (baris pertama boleh header). Max 100/baris. Rate limit
        20/jam tetap berlaku.
      </p>
      <div className="mt-3 flex items-center gap-2">
        <input type="file" accept=".csv,.txt" onChange={onFile} className="text-sm" />
        {rows.length > 0 && (
          <button
            onClick={run}
            disabled={running}
            className="qr-btn text-sm disabled:opacity-50"
          >
            {running ? `${done}/${rows.length}...` : `Buat ${rows.length} link`}
          </button>
        )}
      </div>
      {rows.length > 0 && (
        <div className="mt-3 max-h-64 overflow-y-auto text-xs">
          <table className="qr-table w-full">
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className="max-w-48 truncate p-1">{r.url}</td>
                  <td className="p-1 font-mono">{r.alias || "-"}</td>
                  <td className="p-1">
                    {r.ok === undefined ? (
                      <span className="text-zinc-400">antre</span>
                    ) : r.ok ? (
                      <span className="text-green-700">/r/{r.slug}</span>
                    ) : (
                      <span className="text-red-600">{r.error}</span>
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
