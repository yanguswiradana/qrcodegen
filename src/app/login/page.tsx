"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email, password });
      setLoading(false);
      if (error) return setError(error.message);
      if (data.session) {
        router.push("/dashboard");
        router.refresh();
      } else {
        setInfo("Akun dibuat. Cek email verifikasi, lalu masuk.");
        setMode("signin");
      }
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return setError(error.message);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-sm px-6 py-20">
      <h1 className="text-2xl font-bold">
        {mode === "signin" ? "Masuk" : "Daftar"}
      </h1>

      <div className="mt-4 flex gap-2 text-sm">
        <button
          onClick={() => setMode("signin")}
          className={`rounded border px-3 py-1 ${mode === "signin" ? "bg-black text-white" : ""}`}
        >
          Masuk
        </button>
        <button
          onClick={() => setMode("signup")}
          className={`rounded border px-3 py-1 ${mode === "signup" ? "bg-black text-white" : ""}`}
        >
          Daftar
        </button>
      </div>

      <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
        <input
          type="email"
          required
          placeholder="email@contoh.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded border px-3 py-2"
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder="Password (min 6)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded border px-3 py-2"
        />
        <button
          disabled={loading}
          className="rounded bg-black py-2 text-white disabled:opacity-50"
        >
          {loading ? "..." : mode === "signin" ? "Masuk" : "Buat akun"}
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
      {info && <p className="mt-4 text-sm text-green-700">{info}</p>}
    </main>
  );
}
