"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
      <div className="mb-3 flex items-center justify-between text-sm">
        <p className="text-zinc-600">
          {locked
            ? "Kuota gratis habis (3/3)."
            : `Coba gratis: sisa ${left} dari ${LIMIT} QR.`}
        </p>
        <Link href="/login" className="underline">
          Daftar gratis untuk unlimited
        </Link>
      </div>

      {locked ? (
        <div className="rounded border p-6 text-center">
          <p className="font-semibold">Kuota coba gratis habis</p>
          <p className="mt-1 text-sm text-zinc-600">
            Daftar untuk generate tanpa batas + short link + tracking scan.
          </p>
          <div className="mt-4 flex justify-center gap-3">
            <Link
              href="/login"
              className="rounded bg-black px-5 py-2 text-white"
            >
              Daftar / Masuk
            </Link>
          </div>
        </div>
      ) : (
        <QrStaticForm onGenerated={count} />
      )}
    </div>
  );
}
