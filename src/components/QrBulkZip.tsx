"use client";

import { useState } from "react";
import JSZip from "jszip";
import { toPngDataUrl } from "@/lib/qr";
import { shortBase } from "@/lib/short";
import { useT } from "@/components/LocaleProvider";

// Unduh ZIP semua link yang cocok filter (maks 200, bukan cuma halaman ini).
export default function QrBulkZip({ query }: { query: string }) {
  const t = useT();
  const [zipping, setZipping] = useState(false);
  const [progress, setProgress] = useState("");

  async function downloadZip() {
    if (zipping) return;
    setZipping(true);
    setProgress("");
    try {
      const res = await fetch(
        `/api/links?q=${encodeURIComponent(query)}&per_page=200`
      );
      const data = await res.json().catch(() => ({}));
      const slugs: string[] = (data.links ?? []).map(
        (l: { slug: string }) => l.slug
      );
      if (slugs.length === 0) {
        setProgress(t("zipEmpty"));
        return;
      }
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

  return (
    <button
      onClick={downloadZip}
      disabled={zipping}
      title={t("zipBtn")}
      className="qr-btn-ghost px-3 py-1 text-sm disabled:opacity-50"
    >
      {zipping ? t("zipPreparing", { p: progress }) : t("zipBtn")}
    </button>
  );
}
