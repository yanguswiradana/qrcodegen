import FreeQrGate from "@/components/FreeQrGate";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-16 sm:py-24">
      <p className="inline-block rounded-full border border-lime-300/30 bg-lime-300/10 px-3 py-1 text-xs text-lime-200">
        Self-hostable · MIT · Next.js + Supabase
      </p>
      <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl">
        QR + short link,
        <br />
        <span className="text-lime-300">satu tempat.</span>
      </h1>
      <p className="mt-4 max-w-xl text-zinc-400">
        Static QR instan: URL, teks, WiFi, vCard → PNG/SVG. Gratis 3x coba,
        tanpa daftar.
      </p>

      <FreeQrGate />

      <div className="mt-12 grid gap-3 sm:grid-cols-3">
        {[
          ["Static QR", "Warna, logo, frame, ECC L–H"],
          ["Dynamic + short", "Edit target, expiry, password"],
          ["Tracking", "Klik, device, grafik 7 hari"],
        ].map(([t, d]) => (
          <div key={t} className="qr-card p-4">
            <p className="font-semibold text-lime-200">{t}</p>
            <p className="mt-1 text-sm text-zinc-400">{d}</p>
          </div>
        ))}
      </div>

      <p className="mt-10 text-sm text-zinc-500">
        OSS:{" "}
        <a
          href="https://github.com/yanguswiradana/qrcodegen"
          className="underline underline-offset-4"
          target="_blank"
        >
          github.com/yanguswiradana/qrcodegen
        </a>
      </p>
    </main>
  );
}
