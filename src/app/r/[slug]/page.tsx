import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import PasswordGate from "@/components/PasswordGate";
import LinkExpired from "@/components/LinkExpired";

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

  // Baca via RPC definer: RLS links hanya "own links" sehingga select anon
  // langsung selalu kosong. RPC hanya exposing kolom minimal (tanpa hash).
  const { data } = await supabase.rpc("get_link_public", { p_slug: slug });
  const link = (Array.isArray(data) ? data[0] : data) as {
    target_url: string;
    expires_at: string | null;
    has_password: boolean;
  } | null;

  if (!link) notFound();
  if (link.expires_at && new Date(link.expires_at) <= new Date())
    return <LinkExpired slug={slug} expiredAt={link.expires_at} />;

  // Link berpassword: minta pw via query (?pw=) atau tampilkan gate.
  if (link.has_password) {
    if (!pw) return <PasswordGate slug={slug} />;
    const { data: ok } = await supabase.rpc("verify_link_password", {
      p_slug: slug,
      p_password: pw,
    });
    if (ok !== true) return <PasswordGate slug={slug} error="Password salah" />;
  }

  await track(slug, ua, ip ?? undefined);
  redirect(link.target_url);
}
