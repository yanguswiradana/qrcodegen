import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { genSlug } from "@/lib/slug";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Login dulu" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const targetUrl = body?.target_url?.trim();
  const name = body?.name?.trim() || null;

  try {
    new URL(targetUrl);
  } catch {
    return NextResponse.json({ error: "URL tidak valid" }, { status: 400 });
  }

  for (let i = 0; i < 5; i++) {
    const slug = genSlug(7);
    const { data, error } = await supabase
      .from("links")
      .insert({ slug, target_url: targetUrl, created_by: user.id })
      .select("id, slug")
      .single();
    if (!error && data) {
      await supabase.from("qr_codes").insert({
        type: "dynamic",
        link_id: data.id,
        payload: data.slug,
        name,
        created_by: user.id,
      });
      return NextResponse.json({ slug: data.slug });
    }
    if (error && !String(error.message).includes("duplicate")) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
  return NextResponse.json({ error: "Slug bentrok, coba lagi" }, { status: 500 });
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Login dulu" }, { status: 401 });

  const { data } = await supabase
    .from("links")
    .select("slug, target_url, clicks, created_at")
    .eq("created_by", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  return NextResponse.json({ links: data ?? [] });
}
