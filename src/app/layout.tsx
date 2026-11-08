import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://qrcodegen-arxcode.vercel.app"),
  title: {
    default: "QRGen — QR Code + Short Link",
    template: "%s · QRGen",
  },
  description:
    "Static QR instan (URL, teks, WiFi, vCard) + dynamic QR dan short link dengan tracking scan. Self-hostable, MIT.",
  openGraph: {
    title: "QRGen — QR + short link, satu tempat.",
    description:
      "Static QR instan → PNG/SVG. Dynamic QR + short link dengan expiry, password, dan tracking scan.",
    url: "/",
    siteName: "QRGen",
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "QRGen — QR + short link, satu tempat.",
    description:
      "Static QR instan → PNG/SVG. Dynamic QR + short link dengan tracking scan.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
