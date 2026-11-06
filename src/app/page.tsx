import Link from "next/link";
import FreeQrGate from "@/components/FreeQrGate";

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="text-4xl font-bold">QRGen — QR + short link satu tempat</h1>
      <p className="mt-4 text-zinc-600">
        Static QR instan. Dynamic QR bisa edit + tracking scan. Login pakai
        email + password.
      </p>
      <div className="mt-8 flex gap-3">
        <Link href="/login" className="rounded bg-black px-5 py-2.5 text-white">
          Masuk
        </Link>
        <Link href="/dashboard" className="rounded border px-5 py-2.5">
          Dashboard
        </Link>
      </div>

      <FreeQrGate />

      <ul className="mt-12 list-disc pl-6 text-zinc-700">
        <li>Static: URL, teks, WiFi, vCard → PNG/SVG</li>
        <li>Dynamic: /r/slug, edit target, hitung scan</li>
        <li>Warna + error correction L/M/Q/H</li>
      </ul>
      <p className="mt-8 text-sm text-zinc-500">
        Self-hostable (MIT):{" "}
        <a
          href="https://github.com/yanguswiradana/qrcodegen"
          className="underline"
          target="_blank"
        >
          github.com/yanguswiradana/qrcodegen
        </a>
      </p>
    </main>
  );
}
