"use client";

import LinkRowActions from "@/components/LinkRowActions";
import QrDownloadButton from "@/components/QrDownloadButton";

export type LinkRow = {
  slug: string;
  target_url: string;
  clicks: number | null;
  expires_at: string | null;
};

export default function LinksTable({ links }: { links: LinkRow[] }) {
  if (links.length === 0) {
    return <p className="mt-4 text-sm text-zinc-500">Belum ada link.</p>;
  }

  return (
    <div className="mt-4 overflow-x-auto rounded border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-zinc-50 text-left">
            <th className="p-2">Slug</th>
            <th className="p-2">Tujuan</th>
            <th className="p-2">Klik</th>
            <th className="p-2">Expired</th>
            <th className="p-2">QR</th>
            <th className="p-2">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {links.map((l) => (
            <tr key={l.slug} className="border-t">
              <td className="p-2 font-mono">
                <a href={`/r/${l.slug}`} target="_blank" className="underline">
                  /r/{l.slug}
                </a>{" "}
                <a
                  href={`/s/${l.slug}`}
                  target="_blank"
                  className="text-xs text-zinc-500"
                  title="Statistik publik"
                >
                  stats
                </a>
              </td>
              <td className="max-w-64 truncate p-2">{l.target_url}</td>
              <td className="p-2">{l.clicks}</td>
              <td className="p-2 text-xs">
                {l.expires_at
                  ? new Date(l.expires_at).toLocaleDateString("id-ID")
                  : "-"}
              </td>
              <td className="p-2">
                <QrDownloadButton slug={l.slug} />
              </td>
              <td className="p-2">
                <LinkRowActions slug={l.slug} targetUrl={l.target_url} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
