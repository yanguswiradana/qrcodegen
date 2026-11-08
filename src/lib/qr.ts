import QRCode from "qrcode";

export type QrStyle = {
  color?: string;
  bg?: string;
  ecc?: "L" | "M" | "Q" | "H";
  margin?: number;
  width?: number;
};

export function toPngDataUrl(text: string, style: QrStyle = {}) {
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: style.ecc ?? "M",
    color: { dark: style.color ?? "#000000", light: style.bg ?? "#ffffff" },
    margin: style.margin ?? 2,
    width: style.width ?? 512,
  });
}

export function toSvg(text: string, style: QrStyle = {}) {
  return QRCode.toString(text, {
    type: "svg",
    errorCorrectionLevel: style.ecc ?? "M",
    color: { dark: style.color ?? "#000000", light: style.bg ?? "#ffffff" },
    margin: style.margin ?? 2,
  });
}

export type FancySvgOpts = QrStyle & {
  logoDataUrl?: string;
  logoW?: number;
  logoH?: number;
  frame?: boolean;
  caption?: string;
};

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * SVG yang sama dengan preview PNG: logo contain-fit di quiet zone putih
 * (butuh logoW/logoH asli agar proporsional) + frame/caption opsional.
 * QR tetap vektor; hanya logo yang raster.
 */
export async function toFancySvg(
  text: string,
  opts: FancySvgOpts = {}
): Promise<string> {
  const base = await toSvg(text, opts);
  const m = base.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  const N = m ? parseFloat(m[1]) : 29;
  const inner = base
    .replace(/^<svg[^>]*>/, "")
    .replace(/<\/svg>\s*$/, "");

  let content = inner;
  if (opts.logoDataUrl && opts.logoW && opts.logoH) {
    const box = N * 0.24;
    const x = (N - box) / 2;
    const y = (N - box) / 2;
    const pad = box * 0.14;
    const s = Math.min(
      (box - pad * 2) / opts.logoW,
      (box - pad * 2) / opts.logoH
    );
    const w = opts.logoW * s;
    const h = opts.logoH * s;
    const lx = x + (box - w) / 2;
    const ly = y + (box - h) / 2;
    content +=
      `<rect x="${x}" y="${y}" width="${box}" height="${box}" ` +
      `rx="${box * 0.18}" fill="#ffffff"/>` +
      `<image href="${opts.logoDataUrl}" x="${lx}" y="${ly}" ` +
      `width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet"/>`;
  }

  const cap =
    opts.frame && opts.caption ? opts.caption.slice(0, 24) : "";
  if (opts.frame) {
    const p = N * 0.06;
    const capH = cap ? N * 0.12 : 0;
    const W = N + p * 2;
    const H = N + p * 2 + capH;
    const capSvg = cap
      ? `<text x="${W / 2}" y="${N + p * 2 + capH * 0.68}" ` +
        `text-anchor="middle" font-family="sans-serif" ` +
        `font-weight="bold" font-size="${capH * 0.46}" ` +
        `fill="#000000">${escapeXml(cap)}</text>`
      : "";
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" ` +
      `viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges">` +
      `<rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>` +
      `<svg x="${p}" y="${p}" width="${N}" height="${N}" ` +
      `viewBox="0 0 ${N} ${N}" shape-rendering="crispEdges">${content}</svg>` +
      capSvg +
      `</svg>`
    );
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${N} ${N}" ` +
    `shape-rendering="crispEdges">${content}</svg>`
  );
}
