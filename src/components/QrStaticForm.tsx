"use client";

import { useState } from "react";
import { toPngDataUrl, toSvg } from "@/lib/qr";

export default function QrStaticForm() {
  const [text, setText] = useState("https://");
  const [color, setColor] = useState("#000000");
  const [bg, setBg] = useState("#ffffff");
  const [png, setPng] = useState("");
  const [svg, setSvg] = useState("");

  async function gen(ecc: "L" | "M" | "Q" | "H" = "M") {
    if (!text.trim()) return;
    const style = { color, bg, ecc };
    setPng(await toPngDataUrl(text, style));
    setSvg(await toSvg(text, style));
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
