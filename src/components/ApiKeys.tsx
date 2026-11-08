"use client";

import { useState } from "react";
import { useLocale, useT } from "@/components/LocaleProvider";
import { dateLocale } from "@/lib/i18n";

type Key = {
  id: string;
  prefix: string;
  name: string;
  last_used_at: string | null;
  created_at: string;
};

export default function ApiKeys() {
  const t = useT();
  const { locale } = useLocale();
  const dl = dateLocale(locale);
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
    if (!res.ok) return setMsg(data.error ?? t("failed"));
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
      setMsg(t("copyFail2"));
    }
  }

  async function remove(id: string) {
    if (!confirm(t("delKeyConfirm"))) return;
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
        {t("keysBtn")}
      </button>
    );
  }

  return (
    <div className="qr-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t("keysTitle")}</h2>
        <button onClick={() => setOpen(false)} className="text-sm text-zinc-400">
          {t("close")}
        </button>
      </div>
      <p className="mt-1 text-xs text-zinc-400">
        {t("keysDesc", { target_url: "{target_url}" })}
      </p>
      <div className="mt-3 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("keyNamePh")}
          className="qr-input text-sm"
        />
        <button onClick={create} className="qr-btn text-sm">
          {t("create")}
        </button>
      </div>
      {fresh && (
        <>
          <div className="mt-2 flex items-start gap-2 rounded border border-[var(--line)] bg-black/40 p-2">
            <p className="flex-1 break-all font-mono text-xs">{fresh}</p>
            <button
              type="button"
              onClick={copyFresh}
              className="qr-btn-ghost shrink-0 px-2 py-1 text-xs"
            >
              {copied ? t("copied") : t("copy")}
            </button>
          </div>
          <p className="mt-1 text-xs text-amber-400">{t("copyNow")}</p>
        </>
      )}
      {msg && <p className="mt-2 text-sm text-red-400">{msg}</p>}
      {keys.map((k) => (
        <div key={k.id} className="mt-2 flex items-start justify-between gap-2 text-sm">
          <div className="min-w-0">
            <p className="truncate font-mono text-xs">
              {k.prefix}... · {k.name}
            </p>
            <p className="mt-0.5 text-[11px] text-zinc-400">
              {t("madeAt")}{" "}
              {new Date(k.created_at).toLocaleDateString(dl, {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}{" "}
              ·{" "}
              {k.last_used_at
                ? `${t("usedAt")} ${new Date(k.last_used_at).toLocaleDateString(dl, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}`
                : t("neverUsed")}
            </p>
          </div>
          <button
            onClick={() => remove(k.id)}
            className="shrink-0 text-xs text-red-400"
          >
            {t("rowDelete")}
          </button>
        </div>
      ))}
    </div>
  );
}
