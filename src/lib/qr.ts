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
