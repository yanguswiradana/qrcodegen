"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/LocaleProvider";

export default function QrDynamicForm() {
  const t = useT();
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [alias, setAlias] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [password, setPassword] = useState("");
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  function validTarget(u: string): boolean {
    try {
      const p = new URL(u.trim());
      return p.protocol === "http:" || p.protocol === "https:";
    } catch {
      return false;
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setResult("");
    setCopied(false);
    if (!validTarget(url)) {
      setError(t("badUrl"));
      return;
    }
    setLoading(true);
    const res = await fetch("/api/links", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ target_url: url, name, alias, expires_at: expiresAt, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) return setError(data.error ?? t("failed"));
    setResult(`${location.origin}/r/${data.slug}`);
    setAlias("");
    setExpiresAt("");
    setPassword("");
    router.refresh();
  }

  async function copyResult() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(t("copyFail"));
    }
  }

  return (
    <div className="qr-card p-5">
      <h2 className="font-semibold">{t("dynTitle")}</h2>
      <form onSubmit={submit} className="mt-3 flex flex-col gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
          placeholder={t("urlPh2")}
          className="qr-input"
        />
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("namePh")}
            className="qr-input flex-1"
          />
          <input
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            placeholder={t("aliasPh")}
            className="qr-input w-36 font-mono text-sm"
          />
        </div>
        <input
          type="datetime-local"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          className="qr-input text-sm"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t("pwPh")}
          className="qr-input text-sm"
        />
        <button disabled={loading} className="qr-btn disabled:opacity-50">
          {loading ? t("submitting") : t("submit")}
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      {result && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
          <p>
            {t("resultPrefix")}{" "}
            <a href={result} className="underline" target="_blank">
              {result}
            </a>
          </p>
          <button
            type="button"
            onClick={copyResult}
            className="qr-btn-ghost px-2 py-1 text-xs"
          >
            {copied ? t("copied") : t("copy")}
          </button>
        </div>
      )}
    </div>
  );
}
