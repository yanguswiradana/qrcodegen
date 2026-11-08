"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/LocaleProvider";

export default function LinkRowActions({
  slug,
  targetUrl,
  onChanged,
}: {
  slug: string;
  targetUrl: string;
  onChanged?: () => void;
}) {
  const t = useT();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [url, setUrl] = useState(targetUrl);
  const [expiresAt, setExpiresAt] = useState("");
  const [password, setPassword] = useState("");
  const [pwTouched, setPwTouched] = useState(false);
  const [newSlug, setNewSlug] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState<"save" | "del" | null>(null);

  async function save() {
    if (busy) return;
    const ns = newSlug.trim();
    const renaming = ns !== "" && ns !== slug;
    if (renaming) {
      if (!confirm(t("renameConfirm", { slug, ns }))) return;
    }
    setMsg("");
    setBusy("save");
    try {
      const res = await fetch("/api/links", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          slug,
          target_url: url,
          expires_at: expiresAt || null,
          ...(pwTouched ? { password: password || null } : {}),
          ...(renaming ? { new_slug: ns } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setMsg(data.error ?? t("failed"));
      setEditing(false);
      setNewSlug("");
      onChanged?.();
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (busy) return;
    if (!confirm(t("delConfirm", { slug }))) return;
    setBusy("del");
    try {
      const res = await fetch(`/api/links?slug=${encodeURIComponent(slug)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setMsg(data.error ?? t("failed"));
      onChanged?.();
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  if (!editing) {
    return (
      <div className="flex gap-1">
        <button
          onClick={() => {
            setUrl(targetUrl);
            setNewSlug("");
            setEditing(true);
          }}
          className="qr-btn-ghost px-2 py-1 text-xs"
        >
          {t("rowEdit")}
        </button>
        <button
          onClick={remove}
          disabled={busy !== null}
          className="qr-btn-ghost px-2 py-1 text-xs text-red-400 disabled:opacity-50"
        >
          {busy === "del" ? "…" : t("rowDelete")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="qr-input w-48 text-xs"
      />
      <input
        type="datetime-local"
        value={expiresAt}
        onChange={(e) => setExpiresAt(e.target.value)}
        className="qr-input w-48 text-xs"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          setPwTouched(true);
        }}
        placeholder={t("newPwPh")}
        className="qr-input w-48 text-xs"
      />
      <input
        value={newSlug}
        onChange={(e) => setNewSlug(e.target.value)}
        placeholder={t("newAliasPh")}
        className="qr-input w-48 font-mono text-xs"
      />
      <div className="flex gap-1">
        <button
          onClick={save}
          disabled={busy !== null}
          className="qr-btn px-2 py-1 text-xs disabled:opacity-50"
        >
          {busy === "save" ? "…" : t("rowSave")}
        </button>
        <button
          onClick={() => setEditing(false)}
          disabled={busy !== null}
          className="qr-btn-ghost px-2 py-1 text-xs disabled:opacity-50"
        >
          {t("rowCancel")}
        </button>
      </div>
      {msg && <p className="text-xs text-red-400">{msg}</p>}
    </div>
  );
}
