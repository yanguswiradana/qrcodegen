"use client";

import { useState } from "react";
import { toPngDataUrl, toFancySvg, qrCells } from "@/lib/qr";
import { useT } from "@/components/LocaleProvider";

function drawLogo(
  img: HTMLImageElement,
  png: string,
  cells: number
): Promise<string> {
  return new Promise((resolve) => {
    const qr = new Image();
    qr.onload = () => {
      const c = document.createElement("canvas");
      c.width = qr.width;
      c.height = qr.height;
      const ctx = c.getContext("2d")!;
      ctx.drawImage(qr, 0, 0);
      // Snap ke grid modul: tepi kotak lurus mengikuti kotak-kotak QR.
      // Ukuran ~24% sisi QR: aman untuk ECC H (recovery ±30%).
      const cellPx = qr.width / cells;
      const boxCells = Math.max(3, Math.round(cells * 0.24));
      const bx = Math.round((cells - boxCells) / 2);
      const box = boxCells * cellPx;
      const x = bx * cellPx;
      const y = bx * cellPx;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(x, y, box, box, box * 0.18);
      } else {
        ctx.rect(x, y, box, box);
      }
      ctx.fill();
      ctx.strokeStyle = "#e4e4e7";
      ctx.lineWidth = Math.max(1, Math.round(cellPx * 0.12));
      ctx.stroke();
      // Logo di-fit proporsional (contain), tidak dipaksa persegi.
      const pad = box * 0.14;
      const iw = Math.max(1, box - pad * 2);
      const ih = Math.max(1, box - pad * 2);
      const nw = img.naturalWidth || img.width || 1;
      const nh = img.naturalHeight || img.height || 1;
      const scale = Math.min(iw / nw, ih / nh);
      const w = nw * scale;
      const h = nh * scale;
      ctx.drawImage(img, x + (box - w) / 2, y + (box - h) / 2, w, h);
      resolve(c.toDataURL("image/png"));
    };
    qr.src = png;
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("logo"));
    img.src = src;
  });
}

function withFrame(png: string, caption: string, size: number): Promise<string> {
  return new Promise((resolve) => {
    const qr = new Image();
    qr.onload = () => {
      const pad = Math.round(size * 0.06);
      const capH = caption ? Math.round(size * 0.12) : 0;
      const c = document.createElement("canvas");
      c.width = size + pad * 2;
      c.height = size + pad * 2 + capH;
      const ctx = c.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(qr, pad, pad, size, size);
      if (caption) {
        ctx.fillStyle = "#000000";
        ctx.font = `bold ${Math.round(size * 0.055)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.fillText(caption.slice(0, 24), c.width / 2, size + pad * 2 + capH * 0.68);
      }
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
  const t = useT();
  const [text, setText] = useState("");
  const [color, setColor] = useState("#000000");
  const [bg, setBg] = useState("#ffffff");
  const [ecc, setEcc] = useState<"L" | "M" | "Q" | "H">("M");
  const [frame, setFrame] = useState(false);
  const [caption, setCaption] = useState("");
  const [size, setSize] = useState(512);
  const [png, setPng] = useState("");
  const [logoPreview, setLogoPreview] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");

  // Hanya tombol "Buat" yang memicu generate + hitung kuota.
  // Pilihan ECC/warna/frame cuma ubah state, tidak generate ulang.
  async function gen() {
    if (!text.trim() || disabled || generating) return;
    setGenerating(true);
    setGenError("");
    try {
      const style = { color, bg, ecc };
      const cells = qrCells(text, ecc);
      let out = await toPngDataUrl(text, { ...style, width: size });
      if (logoPreview) {
        let logo: HTMLImageElement;
        try {
          logo = await loadImage(logoPreview);
        } catch {
          setGenError(t("logoFail"));
          return;
        }
        let done = await drawLogo(logo, out, cells);
        if (frame) done = await withFrame(done, caption, size);
        setPng(done);
      } else {
        if (frame) out = await withFrame(out, caption, size);
        setPng(out);
      }
      onGenerated?.();
    } catch {
      setGenError(t("genFail"));
    } finally {
      setGenerating(false);
    }
  }

  function onLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return setLogoPreview("");
    const reader = new FileReader();
    reader.onload = () => {
      setLogoPreview(String(reader.result));
      // Logo menutup ±6% area tengah: wajib ECC H agar tetap terbaca.
      setEcc("H");
    };
    reader.readAsDataURL(f);
  }

  function download(href: string, name: string) {
    const a = document.createElement("a");
    a.href = href;
    a.download = name;
    a.click();
  }

  // SVG dibangun saat klik agar selalu sinkron dengan state (logo/frame/ECC).
  async function downloadSvg() {
    let lw = 0;
    let lh = 0;
    if (logoPreview) {
      try {
        const img = await loadImage(logoPreview);
        lw = img.naturalWidth || img.width;
        lh = img.naturalHeight || img.height;
      } catch {
        /* logo rusak: unduh versi tanpa logo */
      }
    }
    const out = await toFancySvg(text, {
      color,
      bg,
      ecc,
      logoDataUrl: lw && lh ? logoPreview : undefined,
      logoW: lw,
      logoH: lh,
      frame,
      caption,
    });
    download(
      "data:image/svg+xml;charset=utf-8," + encodeURIComponent(out),
      "qr.svg"
    );
  }

  return (
    <div className="qr-card p-5">
      <h2 className="font-semibold">{t("staticTitle")}</h2>
      <div className="mt-3 flex flex-col gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("urlPh")}
          className="qr-input"
        />
        <div className="flex flex-wrap gap-2">
          <label className="qr-swatch">
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
            {t("colorFg")}
          </label>
          <label className="qr-swatch">
            <input type="color" value={bg} onChange={(e) => setBg(e.target.value)} />
            {t("colorBg")}
          </label>
          <label className="qr-file">
            <input type="file" accept="image/*" onChange={onLogo} />
            {logoPreview ? t("changeLogo") : t("addLogo")}
          </label>
          {logoPreview && (
            <button
              type="button"
              onClick={() => setLogoPreview("")}
              className="qr-btn-ghost !py-1.5 text-xs text-red-400"
            >
              {t("removeLogo")}
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={frame} onChange={(e) => setFrame(e.target.checked)} />
            {t("frame")}
          </label>
          {frame && (
            <input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder={t("framePh")}
              className="qr-input w-32 text-sm"
            />
          )}
          <select
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
            className="qr-input w-auto text-sm"
          >
            <option value={256}>256px</option>
            <option value={512}>512px</option>
            <option value={1024}>1024px</option>
          </select>
        </div>
        <div className="flex gap-2">
          {(["L", "M", "Q", "H"] as const).map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEcc(e)}
              title={`ECC ${e}`}
              disabled={!text.trim() || disabled}
              className={
                (e === ecc ? "qr-btn" : "qr-btn-ghost") +
                " disabled:opacity-40"
              }
            >
              {e}
            </button>
          ))}
          <button
            onClick={() => gen()}
            disabled={!text.trim() || disabled || generating}
            className="qr-btn disabled:opacity-50"
          >
            {generating ? t("making") : t("make")}
          </button>
        </div>
        {genError && <p className="text-xs text-red-400">{genError}</p>}
        {logoPreview && ecc === "H" && (
          <p className="text-xs text-lime-300">{t("logoOk")}</p>
        )}
        {logoPreview && ecc !== "H" && (
          <p className="text-xs text-amber-400">
            {t("logoWarn", { ecc })}
          </p>
        )}
      </div>

      {png && (
        <div className="mt-4 flex items-start gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={png} alt={t("qrAlt")} className="h-48 w-48 border" />
          <div className="flex flex-col gap-2">
            <button onClick={() => download(png, `qr-${size}.png`)} className="qr-btn">
              {t("dlPng", { size })}
            </button>
            <button onClick={downloadSvg} className="qr-btn-ghost">
              {t("dlSvg")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
