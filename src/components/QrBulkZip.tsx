"use client";

import { useState } from "react";
import JSZip from "jszip";
import { toPngDataUrl } from "@/lib/qr";
import { shortBase } from "@/lib/short";

export default function QrBulkZip({ slugs }: { slugs: string[] }) {
  const [zipping, setZipping] = useState(false);
  const [progress, setProgress] = useState("");

  async function downloadZip() {
    if (zipping || slugs.length === 0) return;
    setZipping(true);
    setProgress("");
    try {
      const zip = new JSZip();
      let n = 0;
      for (const slug of slugs) {
        const png = await toPngDataUrl(`${shortBase()}/r/${slug}`, {
          ecc: "M",
        });
        zip.file(`qr-${slug}.png`, png.split(",")[1], { base64: true });
        n++;
        setProgress(`${n}/${slugs.length}`);
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = "qr-bulk.zip";
      a.click();
      setTimeout(() => URL.revokeObjectURL(href), 5000);
    } finally {
      setZipping(false);
      setProgress("");
    }
  }

  if (slugs.length === 0) return null;

  return (
    <button
      onClick={downloadZip}
      disabled={zipping}
      title="Unduh semua QR di daftar ini sebagai ZIP"
      className="qr-btn-ghost px-3 py-1.5 text-sm disabled:opacity-50"
    >
      {zipping ? `Menyiapkan ${progress}…` : `Unduh ZIP (${slugs.length})`}
    </button>
  );
}
