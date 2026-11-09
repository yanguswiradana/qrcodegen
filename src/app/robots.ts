import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/s/"],
        disallow: ["/dashboard", "/login", "/api/"],
      },
    ],
    sitemap: "https://qrcodegen-arxcode.vercel.app/sitemap.xml",
  };
}
