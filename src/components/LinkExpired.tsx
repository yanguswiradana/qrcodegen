import Link from "next/link";

export default function LinkExpired({
  slug,
  expiredAt,
}: {
  slug: string;
  expiredAt: string | null;
}) {
  return (
    <main className="mx-auto max-w-sm px-6 py-20 text-center">
      <p className="font-mono text-sm text-zinc-400">/r/{slug}</p>
      <h1 className="mt-2 text-xl font-bold">Link kedaluwarsa</h1>
      <p className="mt-2 text-sm text-zinc-400">
        {expiredAt
          ? `Berlaku sampai ${new Date(expiredAt).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}.`
          : "Masa berlakunya sudah habis."}{" "}
        QR yang sudah dicetak ikut mati.
      </p>
      <div className="mt-6">
        <Link href="/" className="qr-btn inline-block">
          Buat punyamu
        </Link>
      </div>
    </main>
  );
}
