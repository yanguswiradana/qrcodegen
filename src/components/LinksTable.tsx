"use client";

import LinkRowActions from "@/components/LinkRowActions";
import QrDownloadButton from "@/components/QrDownloadButton";

export type LinkRow = {
  slug: string;
  target_url: string;
  clicks: number | null;
  expires_at: string | null;
  has_password?: boolean;
};

export default function LinksTable({ links }: { links: LinkRow[] }) {
  if (links.length === 0) {
    return <p className="mt-4 text-sm text-zinc-400">Belum ada link.</p>;
  }

  return (
    <div className="mt-4 overflow-x-auto qr-card">
      <table className="w-full text-sm qr-table">
        <thead>
          <tr className="text-left">
            <th>Slug</th>
            <th>Tujuan</th>
            <th>Klik</th>
            <th>Expired</th>
            <th>QR</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {links.map((l) => (
            <tr key={l.slug}>
              <td className="font-mono">
                <a href={`/r/${l.slug}`} target="_blank" className="underline">
                  /r/{l.slug}
                </a>{" "}
                {l.has_password && <span title="Berpassword">🔒</span>}{" "}
                <a
                  href={`/s/${l.slug}`}
                  target="_blank"
                  className="text-xs text-zinc-400"
                  title="Statistik publik"
                >
                  stats
                </a>
              </td>
              <td className="max-w-64 truncate">{l.target_url}</td>
              <td>{l.clicks}</td>
              <td className="text-xs">
                {l.expires_at
                  ? new Date(l.expires_at).toLocaleDateString("id-ID")
                  : "-"}
              </td>
              <td>
                <QrDownloadButton slug={l.slug} />
              </td>
              <td>
                <LinkRowActions slug={l.slug} targetUrl={l.target_url} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
