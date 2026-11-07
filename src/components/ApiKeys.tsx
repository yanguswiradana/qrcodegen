"use client";

import { useState } from "react";

type Key = {
  id: string;
  prefix: string;
  name: string;
  last_used_at: string | null;
  created_at: string;
};

export default function ApiKeys() {
  const [keys, setKeys] = useState<Key[]>([]);
  const [name, setName] = useState("");
  const [fresh, setFresh] = useState("");
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [copied, setCopied] = useState(false);

  async function load() {
    const res = await fetch("/api/keys");
    const data = await res.json().catch(() => ({}));
    if (res.ok) setKeys(data.keys ?? []);
  }

  async function create() {
    setMsg("");
    setFresh("");
    setCopied(false);
    const res = await fetch("/api/keys", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: name || "default" }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setMsg(data.error ?? "Gagal");
    setFresh(data.api_key);
    setName("");
    load();
  }

  async function copyFresh() {
    if (!fresh) return;
    try {
      await navigator.clipboard.writeText(fresh);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setMsg("Gagal menyalin otomatis, salin manual.");
    }
  }
  async function remove(id: string) {
    if (!confirm("Hapus key ini? Integrasi yang pakai ikut mati.")) return;
    await fetch(`/api/keys?id=${id}`, { method: "DELETE" });
    load();
  }

  if (!open) {
    return (
      <button
        onClick={() => {
          setOpen(true);
          load();
        }}
        className="qr-btn-ghost text-sm"
      >
        API keys
      </button>
    );
  }

  return (
    <div className="qr-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">API keys</h2>
        <button onClick={() => setOpen(false)} className="text-sm text-zinc-400">
          Tutup
        </button>
      </div>
      <p className="mt-1 text-xs text-zinc-400">
        Header: Authorization: Bearer qrgen_... — contoh: POST /api/links
        dengan {"{target_url}"}.
      </p>
      <div className="mt-3 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nama key"
          className="qr-input text-sm"
        />
        <button onClick={create} className="qr-btn text-sm">
          Buat
        </button>
      </div>
      {fresh && (
        <>
          <div className="mt-2 flex items-start gap-2 rounded border border-[var(--line)] bg-black/40 p-2">
            <p className="flex-1 break-all font-mono text-xs">
              {fresh}
            </p>
            <button
              type="button"
              onClick={copyFresh}
              className="qr-btn-ghost shrink-0 px-2 py-1 text-xs"
            >
              {copied ? "Disalin!" : "Salin"}
            </button>
          </div>
          <p className="mt-1 text-xs text-amber-400">
            Salin sekarang, key tidak tampil lagi.
          </p>
        </>
      )}
      {msg && <p className="mt-2 text-sm text-red-400">{msg}</p>}
      {keys.map((k) => (
        <div key={k.id} className="mt-2 flex items-center justify-between text-sm">
          <span className="font-mono text-xs">
            {k.prefix}... · {k.name}
          </span>
          <button onClick={() => remove(k.id)} className="text-xs text-red-400">
            Hapus
          </button>
        </div>
      ))}
    </div>
  );
}
