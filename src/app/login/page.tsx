"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LocaleProvider, useT } from "@/components/LocaleProvider";
import LocaleToggle from "@/components/LocaleToggle";

function LoginInner() {
  const t = useT();
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
        setInfo(t("signupInfo"));
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {mode === "signin" ? t("signIn") : t("signUp")}
        </h1>
        <LocaleToggle />
      </div>

      <div className="mt-4 flex gap-2 text-sm">
        <button
          onClick={() => setMode("signin")}
          className={mode === "signin" ? "qr-btn px-3 py-1" : "qr-btn-ghost px-3 py-1"}
        >
          {t("signIn")}
        </button>
        <button
          onClick={() => setMode("signup")}
          className={mode === "signup" ? "qr-btn px-3 py-1" : "qr-btn-ghost px-3 py-1"}
        >
          {t("signUp")}
        </button>
      </div>

      <form onSubmit={submit} className="qr-card p-5 mt-6 flex flex-col gap-3">
        <input
          type="email"
          required
          placeholder={t("emailPh")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="qr-input"
        />
        <input
          type="password"
          required
          minLength={6}
          placeholder={t("loginPwPh")}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="qr-input"
        />
        <button
          disabled={loading}
          className="qr-btn py-2 disabled:opacity-50"
        >
          {loading ? "..." : mode === "signin" ? t("loginBtn") : t("registerBtn")}
        </button>
      </form>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      {info && <p className="mt-4 text-sm text-green-400">{info}</p>}
    </main>
  );
}

export default function LoginPage() {
  return (
    <LocaleProvider initial="id">
      <LoginInner />
    </LocaleProvider>
  );
}
