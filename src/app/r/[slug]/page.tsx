import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

function deviceOf(ua: string) {
  const u = ua.toLowerCase();
  if (/mobile|android|iphone|ipod/.test(u)) return "mobile";
  if (/tablet|ipad/.test(u)) return "tablet";
  return "desktop";
}

export default async function RedirectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const h = await headers();
  const ua = h.get("user-agent") ?? "";
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip");

  const supabase = await createClient();
  const { data } = await supabase.rpc("resolve_link", {
    p_slug: slug,
    p_source: "qr",
    p_ua: ua.slice(0, 500),
    p_device: deviceOf(ua),
    p_ip: ip?.slice(0, 64) ?? null,
  });

  const row = Array.isArray(data) ? data[0] : null;
  if (!row || row.is_expired) redirect("/");
  redirect(row.target_url);
}
