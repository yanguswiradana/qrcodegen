"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import LinkRowActions from "@/components/LinkRowActions";
import QrDownloadButton from "@/components/QrDownloadButton";
import QrBulkZip from "@/components/QrBulkZip";

export type LinkRow = {
  slug: string;
  target_url: string;
  clicks: number | null;
  expires_at: string | null;
  has_password?: boolean;
};

const PER_PAGE = 10;

export default function LinksTable() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<LinkRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [bulkMsg, setBulkMsg] = useState("");
  const reqId = useRef(0);
  const totalRef = useRef(0);

  // Debounce ketikan search.
  useEffect(() => {
    const id = setTimeout(() => {
      setDebounced(query);
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [query]);

  const load = useCallback(async () => {
    const my = ++reqId.current;
    setLoading(true);
    setLoadError("");
    // Jepit halaman ke rentang valid dari total terakhir (tanpa setState:
    // hasil fetch terbaru mengoreksi total di render berikut).
    const totalPages = Math.max(1, Math.ceil(totalRef.current / PER_PAGE));
    const reqPage = Math.min(page, totalPages);
    try {
      const res = await fetch(
        `/api/links?q=${encodeURIComponent(debounced)}&page=${reqPage}&per_page=${PER_PAGE}`
      );
      const data = await res.json().catch(() => ({}));
      if (reqId.current !== my) return;
      if (!res.ok) {
        setLoadError(data.error ?? "Gagal memuat link");
        return;
      }
      totalRef.current = data.total ?? 0;
      setRows((data.links ?? []) as LinkRow[]);
      setTotal(totalRef.current);
    } catch {
      if (reqId.current === my) setLoadError("Network");
    } finally {
      if (reqId.current === my) setLoading(false);
    }
  }, [debounced, page]);

  // setState lewat callback (bukan sinkron di body effect).
  useEffect(() => {
    const id = setTimeout(() => {
      load();
    }, 0);
    return () => clearTimeout(id);
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PER_PAGE;
  // Dibaca sekali per render — badge "lewat" stabil selama render ini.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  const pageSlugs = rows.map((l) => l.slug);
  const allPageSelected =
    pageSlugs.length > 0 && pageSlugs.every((s) => selected.has(s));

  function toggleOne(slug: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  function togglePage() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) pageSlugs.forEach((s) => next.delete(s));
      else pageSlugs.forEach((s) => next.add(s));
      return next;
    });
  }

  async function bulkDelete() {
    if (selected.size === 0 || deleting) return;
    if (
      !confirm(
        `Hapus ${selected.size} link? QR cetak ikut mati dan tidak bisa dibatalkan.`
      )
    )
      return;
    setDeleting(true);
    setBulkMsg("");
    const slugs = [...selected];
    let ok = 0;
    const failed: string[] = [];
    for (const slug of slugs) {
      try {
        const res = await fetch(
          `/api/links?slug=${encodeURIComponent(slug)}`,
          { method: "DELETE" }
        );
        if (res.ok) ok++;
        else failed.push(slug);
      } catch {
        failed.push(slug);
      }
    }
    setDeleting(false);
    setSelected(new Set());
    setBulkMsg(
      failed.length === 0
        ? `${ok} link terhapus.`
        : `${ok} terhapus, gagal: ${failed.join(", ")}`
    );
    router.refresh();
    load();
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari slug / tujuan…"
          className="qr-input max-w-64 text-sm"
        />
        {selected.size > 0 && (
          <button
            onClick={bulkDelete}
            disabled={deleting}
            className="qr-btn-ghost px-3 py-1.5 text-sm text-red-400 disabled:opacity-50"
          >
            {deleting
              ? "Menghapus…"
              : `Hapus ${selected.size} dipilih`}
          </button>
        )}
        <QrBulkZip query={debounced} />
        <span className="ml-auto text-xs text-zinc-400">
          {loading
            ? "Memuat…"
            : total === 0
              ? "0 link"
              : `${start + 1}–${start + rows.length} dari ${total} link`}
          {query.trim() && ` (filter: "${query.trim()}")`}
        </span>
      </div>
      {bulkMsg && <p className="mt-2 text-xs text-zinc-400">{bulkMsg}</p>}
      {loadError && <p className="mt-2 text-xs text-red-400">{loadError}</p>}

      {!loading && total === 0 ? (
        <p className="mt-4 text-sm text-zinc-400">
          {debounced.trim()
            ? `Tidak ada link yang cocok dengan "${debounced.trim()}".`
            : "Belum ada link."}
        </p>
      ) : (
        <div className="mt-2 overflow-x-auto qr-card">
          <table className="w-full text-sm qr-table">
            <thead>
              <tr className="text-left">
                <th>
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={togglePage}
                    title="Pilih semua di halaman ini"
                  />
                </th>
                <th>Slug</th>
                <th>Tujuan</th>
                <th>Klik</th>
                <th>Expired</th>
                <th>QR</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((l) => (
                <tr key={l.slug}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.has(l.slug)}
                      onChange={() => toggleOne(l.slug)}
                    />
                  </td>
                  <td className="font-mono">
                    <a
                      href={`/r/${l.slug}`}
                      target="_blank"
                      className="underline"
                    >
                      /r/{l.slug}
                    </a>{" "}
                    {l.has_password && (
                      <span title="Berpassword">🔒</span>
                    )}{" "}
                    <a
                      href={`/s/${l.slug}`}
                      target="_blank"
                      className="text-xs text-zinc-400"
                      title="Statistik publik"
                    >
                      stats
                    </a>
                  </td>
                  <td className="max-w-64 truncate">{l.target_url}</td>
                  <td>{l.clicks}</td>
                  <td className="text-xs">
                    {l.expires_at
                      ? new Date(l.expires_at).toLocaleDateString("id-ID")
                      : "-"}
                    {l.expires_at &&
                      new Date(l.expires_at).getTime() <= now && (
                        <span className="ml-1 rounded border border-red-400/30 px-1 py-px text-[10px] text-red-400">
                          lewat
                        </span>
                      )}
                  </td>
                  <td>
                    <QrDownloadButton slug={l.slug} />
                  </td>
                  <td>
                    <LinkRowActions
                      slug={l.slug}
                      targetUrl={l.target_url}
                      onChanged={load}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-3 flex items-center gap-1 text-sm">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            className="qr-btn-ghost px-2 py-1 text-xs disabled:opacity-40"
          >
            ← Prev
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(
              (n) =>
                n === 1 ||
                n === totalPages ||
                Math.abs(n - safePage) <= 1
            )
            .reduce<(number | "…")[]>( (acc, n) => {
              const prev = acc[acc.length - 1];
              if (typeof prev === "number" && n - prev > 1) acc.push("…");
              acc.push(n);
              return acc;
            }, [])
            .map((n, i) =>
              n === "…" ? (
                <span key={`e${i}`} className="px-1 text-zinc-500">
                  …
                </span>
              ) : (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  aria-current={n === safePage ? "page" : undefined}
                  className="qr-btn-ghost px-2 py-1 text-xs"
                  style={
                    n === safePage
                      ? { borderColor: "var(--accent)", fontWeight: 700 }
                      : undefined
                  }
                >
                  {n}
                </button>
              )
            )}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            className="qr-btn-ghost px-2 py-1 text-xs disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
