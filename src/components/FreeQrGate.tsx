"use client";

import { useEffect, useState } from "react";
import QrStaticForm from "@/components/QrStaticForm";
import { useT, useLocale } from "@/components/LocaleProvider";

const KEY = "qrgen_free_quota";
const LEGACY_KEY = "qrgen_free_count";
const LIMIT = 3;
const WINDOW_MS = 6 * 3600 * 1000;

type Quota = { used: number; resetAt: number };

function fresh(): Quota {
  return { used: 0, resetAt: Date.now() + WINDOW_MS };
}

function loadQuota(): Quota {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as Quota;
      if (typeof s.used === "number" && typeof s.resetAt === "number") {
        if (Date.now() >= s.resetAt) return fresh();
        return s;
      }
    } else {
      // Migrasi format lama (angka polos): bawa sisa pakai, jendela baru 6 jam.
      const old = localStorage.getItem(LEGACY_KEY);
      if (old !== null) {
        const used = Math.min(Number(old) || 0, LIMIT);
        const q = { used, resetAt: Date.now() + WINDOW_MS };
        localStorage.setItem(KEY, JSON.stringify(q));
        localStorage.removeItem(LEGACY_KEY);
        return q;
      }
    }
  } catch {
    /* abaikan, pakai fresh */
  }
  return fresh();
}

function save(q: Quota) {
  try {
    localStorage.setItem(KEY, JSON.stringify(q));
  } catch {
    /* abaikan */
  }
}

function fmtDur(ms: number, locale: "id" | "en"): string {
  const h = Math.floor(ms / 3600000);
  const m = Math.ceil((ms % 3600000) / 60000);
  return locale === "en" ? `${h}h ${m}m` : `${h} jam ${m} mnt`;
}

export default function FreeQrGate() {
  const t = useT();
  const { locale } = useLocale();
  const [quota, setQuota] = useState<Quota>({ used: 0, resetAt: 0 });
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(0);

  useEffect(() => {
    // setState lewat callback (bukan sinkron di body effect).
    const id = setTimeout(() => {
      setQuota(loadQuota());
      setNow(Date.now());
      setReady(true);
    }, 0);
    // Tik tiap 30 dtk: buka kunci otomatis saat jendela 6 jam lewat.
    const tick = setInterval(() => {
      setQuota((prev) => {
        if (Date.now() >= prev.resetAt) {
          const q = fresh();
          save(q);
          return q;
        }
        return prev;
      });
      setNow(Date.now());
    }, 30000);
    return () => {
      clearTimeout(id);
      clearInterval(tick);
    };
  }, []);

  const locked = ready && quota.used >= LIMIT && now < quota.resetAt;

  function count() {
    setQuota((prev) => {
      const base = Date.now() >= prev.resetAt ? fresh() : prev;
      const next = { used: Math.min(base.used + 1, LIMIT), resetAt: base.resetAt };
      save(next);
      return next;
    });
  }

  if (!ready) {
    return (
      <div className="mt-10" aria-hidden>
        <div className="mb-3 h-5 w-56 animate-pulse rounded bg-white/5" />
        <div className="qr-card h-72 animate-pulse p-5" />
      </div>
    );
  }

  const left = Math.max(0, LIMIT - quota.used);

  return (
    <div className="mt-10">
      <div className="mb-3 text-sm">
        <p className="text-zinc-400">
          {locked
            ? t("freeUsed")
            : `${t("freeLeft", { left, total: LIMIT })} ${t("windowNote")}`}
        </p>
      </div>

      {locked ? (
        <div className="qr-card p-5 text-center">
          <p className="font-semibold">{t("lockedTitle")}</p>
          <p className="mt-1 text-sm text-zinc-400">
            {t("resetIn", { t: fmtDur(quota.resetAt - now, locale) })}
          </p>
          <p className="mt-1 text-sm text-zinc-400">{t("lockedSub")}</p>
        </div>
      ) : (
        <QrStaticForm onGenerated={count} />
      )}
    </div>
  );
}
