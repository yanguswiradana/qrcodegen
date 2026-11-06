"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ email });
    setLoading(false);
    if (error) return setError(error.message);
    setStep("otp");
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "email",
    });
    setLoading(false);
    if (error) return setError(error.message);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-sm px-6 py-20">
      <h1 className="text-2xl font-bold">Masuk</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Kode 6 digit dikirim ke email.
      </p>

      {step === "email" ? (
        <form onSubmit={sendOtp} className="mt-6 flex flex-col gap-3">
          <input
            type="email"
            required
            placeholder="email@contoh.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded border px-3 py-2"
          />
          <button
            disabled={loading}
            className="rounded bg-black py-2 text-white disabled:opacity-50"
          >
            {loading ? "Mengirim..." : "Kirim kode"}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyOtp} className="mt-6 flex flex-col gap-3">
          <input
            inputMode="numeric"
            maxLength={6}
            required
            placeholder="123456"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            className="rounded border px-3 py-2 text-center tracking-widest"
          />
          <button
            disabled={loading}
            className="rounded bg-black py-2 text-white disabled:opacity-50"
          >
            {loading ? "Memverifikasi..." : "Verifikasi & masuk"}
          </button>
          <button
            type="button"
            onClick={() => setStep("email")}
            className="text-sm text-zinc-500 underline"
          >
            Ganti email
          </button>
        </form>
      )}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
    </main>
  );
}
