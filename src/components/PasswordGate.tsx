"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PasswordGate({
  slug,
  error,
}: {
  slug: string;
  error?: string;
}) {
  const router = useRouter();
  const [pw, setPw] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/r/${slug}?pw=${encodeURIComponent(pw)}`);
  }

  return (
    <main className="mx-auto max-w-sm px-6 py-20">
      <h1 className="text-xl font-bold">Link terkunci</h1>
      <p className="mt-1 font-mono text-sm text-zinc-400">/r/{slug}</p>
      <form onSubmit={submit} className="mt-4 flex flex-col gap-2">
        <input
          type="password"
          required
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="Password link"
          autoFocus
          className="qr-input"
        />
        <button className="qr-btn">Buka</button>
      </form>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </main>
  );
}
