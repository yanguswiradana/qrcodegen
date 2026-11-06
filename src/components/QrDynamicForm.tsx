"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function QrDynamicForm() {
  const router = useRouter();
  const [url, setUrl] = useState("https://");
  const [name, setName] = useState("");
  const [alias, setAlias] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setResult("");
    setLoading(true);
    const res = await fetch("/api/links", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ target_url: url, name, alias, expires_at: expiresAt }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error ?? "Gagal");
    setResult(`${location.origin}/r/${data.slug}`);
    setAlias("");
    setExpiresAt("");
    router.refresh();
  }

  return (
    <div className="rounded border p-4">
      <h2 className="font-semibold">Dynamic QR + short link</h2>
      <form onSubmit={submit} className="mt-3 flex flex-col gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
          placeholder="https://tujuan..."
          className="rounded border px-3 py-2"
        />
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nama (opsional)"
            className="rounded border px-3 py-2 flex-1"
          />
          <input
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            placeholder="alias (opsional)"
            className="w-36 rounded border px-3 py-2 font-mono text-sm"
          />
        </div>
        <input
          type="datetime-local"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          className="rounded border px-3 py-2 text-sm"
        />
        <button disabled={loading} className="rounded bg-black py-2 text-white disabled:opacity-50">
          {loading ? "Membuat..." : "Buat link + QR"}
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {result && (
        <p className="mt-2 text-sm">
          Jadi: <a href={result} className="underline" target="_blank">{result}</a>
        </p>
      )}
    </div>
  );
}
