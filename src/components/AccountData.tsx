"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/components/LocaleProvider";

export default function AccountData() {
  const t = useT();
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function download(kind: "links" | "scans") {
    setMsg("");
    try {
      const res = await fetch(`/api/account/export?kind=${kind}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMsg(data.error ?? t("failed"));
        return;
      }
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = `qrgen-${kind}.csv`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(href), 5000);
    } catch {
      setMsg(t("network"));
    }
  }

  async function remove() {
    if (busy) return;
    if (!confirm(t("delAccountC1"))) return;
    if (!confirm(t("delAccountC2"))) return;
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(data.error ?? t("failed"));
        return;
      }
      setMsg(`${t("accountGone")} ${data.deletedAuth ? t("authGone") : t("authKept")}`);
      const supabase = createClient();
      await supabase.auth.signOut();
      setTimeout(() => router.push("/login"), 1500);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="qr-card mt-2 p-5">
      <h3 className="font-semibold">{t("myDataT")}</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        <button onClick={() => download("links")} className="qr-btn-ghost px-3 py-1.5 text-sm">
          {t("exportLinksBtn")}
        </button>
        <button onClick={() => download("scans")} className="qr-btn-ghost px-3 py-1.5 text-sm">
          {t("exportScansBtn")}
        </button>
      </div>
      <div className="mt-4 border-t border-[var(--line)] pt-4">
        <p className="text-xs text-zinc-400">{t("delAccountWarn")}</p>
        <button
          onClick={remove}
          disabled={busy}
          className="qr-btn-ghost mt-2 px-3 py-1.5 text-sm text-red-400 disabled:opacity-50"
        >
          {busy ? t("deleting") : t("delAccountBtn")}
        </button>
      </div>
      {msg && <p className="mt-2 text-xs text-zinc-400">{msg}</p>}
    </div>
  );
}
