"use client";

import { useEffect, useState } from "react";
import QrStaticForm from "@/components/QrStaticForm";

const KEY = "qrgen_free_count";
const LIMIT = 3;

export default function FreeQrGate() {
  const [used, setUsed] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setUsed(Number(localStorage.getItem(KEY) ?? 0));
    setReady(true);
  }, []);

  const left = Math.max(0, LIMIT - used);
  const locked = used >= LIMIT;

  function count() {
    const next = used + 1;
    setUsed(next);
    localStorage.setItem(KEY, String(next));
  }

  if (!ready) return null;

  return (
    <div className="mt-10">
      <div className="mb-3 text-sm">
        <p className="text-zinc-400">
          {locked
            ? "Kuota gratis habis (3/3)."
            : `Coba gratis: sisa ${left} dari ${LIMIT} QR.`}
        </p>
      </div>

      {locked ? (
        <div className="qr-card p-5 text-center">
          <p className="font-semibold">Kuota coba gratis habis</p>
          <p className="mt-1 text-sm text-zinc-400">
            Refresh halaman untuk coba lagi, atau hubungi pemilik untuk akses penuh.
          </p>
        </div>
      ) : (
        <QrStaticForm onGenerated={count} />
      )}
    </div>
  );
}
