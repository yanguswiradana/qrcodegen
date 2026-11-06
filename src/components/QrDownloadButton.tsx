"use client";

import { useState } from "react";
import { toPngDataUrl } from "@/lib/qr";
import { shortBase } from "@/lib/short";

export default function QrDownloadButton({ slug }: { slug: string }) {
  const [loading, setLoading] = useState(false);

  async function download() {
    setLoading(true);
    try {
      const url = `${shortBase()}/r/${slug}`;
      const png = await toPngDataUrl(url, { ecc: "M" });
      const a = document.createElement("a");
      a.href = png;
      a.download = `qr-${slug}.png`;
      a.click();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={download}
      disabled={loading}
      className="rounded border px-2 py-1 text-xs disabled:opacity-50"
    >
      {loading ? "..." : "QR PNG"}
    </button>
  );
}
