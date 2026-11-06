"use client";

import { useState } from "react";
import { toPngDataUrl, toSvg } from "@/lib/qr";

function drawLogo(img: HTMLImageElement, png: string): Promise<string> {
  return new Promise((resolve) => {
    const qr = new Image();
    qr.onload = () => {
      const c = document.createElement("canvas");
      c.width = qr.width;
      c.height = qr.height;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(qr, 0, 0);
      // Logo box: putus agar QR tetap terbaca (ECC M+ disarankan).
      const box = qr.width * 0.26;
      const x = (qr.width - box) / 2;
      const y = (qr.height - box) / 2;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x, y, box, box);
      const pad = box * 0.12;
      ctx.drawImage(img, x + pad, y + pad, box - pad * 2, box - pad * 2);
      resolve(c.toDataURL("image/png"));
    };
    qr.src = png;
  });
}

export default function QrStaticForm({
  onGenerated,
  disabled = false,
}: {
  onGenerated?: () => void;
  disabled?: boolean;
} = {}) {
  const [text, setText] = useState("https://");
  const [color, setColor] = useState("#000000");
  const [bg, setBg] = useState("#ffffff");
  const [png, setPng] = useState("");
  const [svg, setSvg] = useState("");
  const [logoPreview, setLogoPreview] = useState("");

  async function gen(ecc: "L" | "M" | "Q" | "H" = "M") {
    if (!text.trim() || disabled) return;
    const style = { color, bg, ecc };
    let out = await toPngDataUrl(text, style);
    setSvg(await toSvg(text, style));
    if (logoPreview) {
      const logo = new Image();
      logo.onload = async () => {
        setPng(await drawLogo(logo, out));
        onGenerated?.();
      };
      logo.src = logoPreview;
    } else {
      setPng(out);
      onGenerated?.();
    }
  }

  function onLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return setLogoPreview("");
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(String(reader.result));
    reader.readAsDataURL(f);
  }

  function download(href: string, name: string) {
    const a = document.createElement("a");
    a.href = href;
    a.download = name;
    a.click();
  }

  return (
    <div className="rounded border p-4">
      <h2 className="font-semibold">Static QR</h2>
      <div className="mt-3 flex flex-col gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="URL / teks / WiFi / vCard..."
          className="rounded border px-3 py-2"
        />
        <div className="flex gap-2">
          <label className="text-sm">
            Warna <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
          </label>
          <label className="text-sm">
            Latar <input type="color" value={bg} onChange={(e) => setBg(e.target.value)} />
          </label>
          <label className="text-sm">
            Logo <input type="file" accept="image/*" onChange={onLogo} className="text-xs" />
          </label>
        </div>
        <div className="flex gap-2">
          {(["L", "M", "Q", "H"] as const).map((e) => (
            <button key={e} onClick={() => gen(e)} className="rounded border px-3 py-1.5">
              {e}
            </button>
          ))}
          <button onClick={() => gen()} className="rounded bg-black px-4 py-1.5 text-white">
            Buat
          </button>
        </div>
        {logoPreview && (
          <p className="text-xs text-amber-700">
            Logo aktif — pakai ECC M/Q/H agar tetap terbaca.
          </p>
        )}
      </div>

      {png && (
        <div className="mt-4 flex items-start gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={png} alt="QR" className="h-48 w-48 border" />
          <div className="flex flex-col gap-2">
            <button onClick={() => download(png, "qr.png")} className="rounded bg-black px-4 py-1.5 text-white">
              PNG
            </button>
            <button
              onClick={() =>
                download("data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg), "qr.svg")
              }
              className="rounded border px-4 py-1.5"
            >
              SVG
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
