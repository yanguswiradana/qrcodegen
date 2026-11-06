import { createClient } from "@/lib/supabase/server";
import QrDownloadButton from "@/components/QrDownloadButton";

export default async function LinksList() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("links")
    .select("slug, target_url, clicks, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  const links = data ?? [];
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
            <th className="p-2">QR</th>
          </tr>
        </thead>
        <tbody>
          {links.map((l) => (
            <tr key={l.slug} className="border-t">
              <td className="p-2 font-mono">
                <a href={`/r/${l.slug}`} target="_blank" className="underline">
                  /r/{l.slug}
                </a>
              </td>
              <td className="max-w-64 truncate p-2">{l.target_url}</td>
              <td className="p-2">{l.clicks}</td>
              <td className="p-2">
                <QrDownloadButton slug={l.slug} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
