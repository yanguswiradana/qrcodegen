"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LinkRowActions({
  slug,
  targetUrl,
}: {
  slug: string;
  targetUrl: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [url, setUrl] = useState(targetUrl);
  const [expiresAt, setExpiresAt] = useState("");
  const [password, setPassword] = useState("");
  const [pwTouched, setPwTouched] = useState(false);
  const [msg, setMsg] = useState("");

  async function save() {
    setMsg("");
    const res = await fetch("/api/links", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        slug,
        target_url: url,
        expires_at: expiresAt || null,
        ...(pwTouched ? { password: password || null } : {}),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setMsg(data.error ?? "Gagal");
    setEditing(false);
    router.refresh();
  }

  async function remove() {
    if (!confirm(`Hapus /r/${slug}? QR cetak ikut mati.`)) return;
    const res = await fetch(`/api/links?slug=${encodeURIComponent(slug)}`, {
      method: "DELETE",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setMsg(data.error ?? "Gagal");
    router.refresh();
  }

  if (!editing) {
    return (
      <div className="flex gap-1">
        <button
          onClick={() => {
            setUrl(targetUrl);
            setEditing(true);
          }}
          className="rounded border px-2 py-1 text-xs"
        >
          Edit
        </button>
        <button
          onClick={remove}
          className="rounded border px-2 py-1 text-xs text-red-600"
        >
          Hapus
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="w-48 rounded border px-2 py-1 text-xs"
      />
      <input
        type="datetime-local"
        value={expiresAt}
        onChange={(e) => setExpiresAt(e.target.value)}
        className="w-48 rounded border px-2 py-1 text-xs"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          setPwTouched(true);
        }}
        placeholder="Password baru (kosongkan = lepas)"
        className="w-48 rounded border px-2 py-1 text-xs"
      />
      <div className="flex gap-1">
        <button onClick={save} className="rounded bg-black px-2 py-1 text-xs text-white">
          Simpan
        </button>
        <button onClick={() => setEditing(false)} className="rounded border px-2 py-1 text-xs">
          Batal
        </button>
      </div>
      {msg && <p className="text-xs text-red-600">{msg}</p>}
    </div>
  );
}
