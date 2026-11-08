"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/LocaleProvider";

export default function PasswordGate({
  slug,
  error,
}: {
  slug: string;
  error?: string;
}) {
  const t = useT();
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/r/${slug}?pw=${encodeURIComponent(pw)}`);
  }

  return (
    <main className="mx-auto max-w-sm px-6 py-20">
      <h1 className="text-xl font-bold">{t("gateTitle")}</h1>
      <p className="mt-1 font-mono text-sm text-zinc-400">/r/{slug}</p>
      <form onSubmit={submit} className="mt-4 flex flex-col gap-2">
        <input
          type={show ? "text" : "password"}
          required
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder={t("gatePwPh")}
          autoFocus
          className="qr-input"
        />
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="text-xs text-zinc-400 underline underline-offset-4"
          >
            {show ? t("hide") : t("show")}
          </button>
        </div>
        <button className="qr-btn">{t("unlock")}</button>
      </form>
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </main>
  );
}
