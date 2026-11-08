"use client";

import { useEffect, useState } from "react";
import QrStaticForm from "@/components/QrStaticForm";
import { useT } from "@/components/LocaleProvider";

const KEY = "qrgen_free_count";
const LIMIT = 3;

export default function FreeQrGate() {
  const t = useT();
  const [used, setUsed] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // setState lewat callback (bukan sinkron di body effect).
    const id = setTimeout(() => {
      try {
        setUsed(Number(localStorage.getItem(KEY) ?? 0) || 0);
      } catch {
        setUsed(0);
      }
      setReady(true);
    }, 0);
    return () => clearTimeout(id);
  }, []);

  const left = Math.max(0, LIMIT - used);
  const locked = used >= LIMIT;

  function count() {
    const next = used + 1;
    setUsed(next);
    try {
      localStorage.setItem(KEY, String(next));
    } catch {
      /* abaikan */
    }
  }

  if (!ready) {
    return (
      <div className="mt-10" aria-hidden>
        <div className="mb-3 h-5 w-56 animate-pulse rounded bg-white/5" />
        <div className="qr-card h-72 animate-pulse p-5" />
      </div>
    );
  }

  return (
    <div className="mt-10">
      <div className="mb-3 text-sm">
        <p className="text-zinc-400">
          {locked
            ? t("freeUsed")
            : t("freeLeft", { left, total: LIMIT })}
        </p>
      </div>

      {locked ? (
        <div className="qr-card p-5 text-center">
          <p className="font-semibold">{t("lockedTitle")}</p>
          <p className="mt-1 text-sm text-zinc-400">{t("lockedSub")}</p>
        </div>
      ) : (
        <QrStaticForm onGenerated={count} />
      )}
    </div>
  );
}
