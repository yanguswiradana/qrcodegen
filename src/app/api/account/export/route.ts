import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Akun: export CSV (sesi login). kind=links|scans.
function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function csv(rows: (string | number | null)[][]): string {
  return rows.map((r) => r.map(csvCell).join(",")).join("\n") + "\n";
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Login dulu" }, { status: 401 });

  const kind = new URL(request.url).searchParams.get("kind");
  const stamp = new Date().toISOString().slice(0, 10);

  if (kind === "scans") {
    const { data } = await supabase
      .from("scans")
      .select("device, browser, country, created_at, links(slug)")
      .order("created_at", { ascending: false })
      .limit(10000);
    const body = csv([
      ["slug", "device", "browser", "country", "created_at"],
      ...(data ?? []).map((s) => [
        (s.links as unknown as { slug: string } | null)?.slug ?? "",
        s.device ?? "",
        s.browser ?? "",
        s.country ?? "",
        s.created_at,
      ]),
    ]);
    return new NextResponse(body, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="qrgen-scans-${stamp}.csv"`,
      },
    });
  }

  const { data } = await supabase
    .from("links")
    .select("slug, target_url, clicks, created_at, expires_at")
    .eq("created_by", user.id)
    .order("created_at", { ascending: false });
  const body = csv([
    ["slug", "target_url", "clicks", "created_at", "expires_at"],
    ...(data ?? []).map((l) => [
      l.slug,
      l.target_url,
      l.clicks ?? 0,
      l.created_at,
      l.expires_at ?? "",
    ]),
  ]);
  return new NextResponse(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="qrgen-links-${stamp}.csv"`,
    },
  });
}
