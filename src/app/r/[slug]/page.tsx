import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import PasswordGate from "@/components/PasswordGate";

function deviceOf(ua: string) {
  const u = ua.toLowerCase();
  if (/mobile|android|iphone|ipod/.test(u)) return "mobile";
  if (/tablet|ipad/.test(u)) return "tablet";
  return "desktop";
}

async function track(slug: string, ua: string, ip: string | undefined) {
  const supabase = await createClient();
  await supabase.rpc("resolve_link", {
    p_slug: slug,
    p_source: "qr",
    p_ua: ua.slice(0, 500),
    p_device: deviceOf(ua),
    p_ip: ip?.slice(0, 64) ?? null,
  });
}

export default async function RedirectPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ pw?: string }>;
}) {
  const { slug } = await params;
  const { pw } = await searchParams;
  const h = await headers();
  const ua = h.get("user-agent") ?? "";
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip");

  const supabase = await createClient();
  const { data: link } = await supabase
    .from("links")
    .select("target_url, expires_at, password_hash")
    .eq("slug", slug)
    .maybeSingle();

  if (!link) redirect("/");
  if (link.expires_at && new Date(link.expires_at) <= new Date()) redirect("/");

  // Link berpassword: minta pw via query (?pw=) atau tampilkan gate.
  if (link.password_hash) {
    if (!pw) return <PasswordGate slug={slug} />;
    const { data: ok } = await supabase.rpc("verify_link_password", {
      p_slug: slug,
      p_password: pw,
    });
    if (ok !== true) return <PasswordGate slug={slug} error="Password salah" />;
  }

  await track(slug, ua, ip);
  redirect(link.target_url);
}
