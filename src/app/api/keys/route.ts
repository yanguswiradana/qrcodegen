import { NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { LOCALE_COOKIE, tx, type Locale, type MsgKey } from "@/lib/i18n";

function localeOf(request: Request): Locale {
  const m = request.headers
    .get("cookie")
    ?.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=(id|en)`));
  return m ? (m[1] as Locale) : "id";
}

function tOf(request: Request) {
  const locale = localeOf(request);
  return (key: MsgKey) => tx(locale, key);
}

function hash(s: string) {
  return createHash("sha256").update(s).digest("hex");
}

// POST: buat key baru (plaintext tampil SEKALI di response).
export async function POST(request: Request) {
  const supabase = await createClient();
  const t = tOf(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: t("apiLogin") }, { status: 401 });

  const body = await request.json().catch(() => null);
  const name = body?.name?.trim() || "default";

  const raw = `qrgen_${randomBytes(24).toString("hex")}`;
  const prefix = raw.slice(0, 12);
  const { error } = await supabase.from("api_keys").insert({
    prefix,
    key_hash: hash(raw),
    name,
    created_by: user.id,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ api_key: raw, prefix });
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const t = tOf(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: t("apiLogin") }, { status: 401 });

  const { data } = await supabase
    .from("api_keys")
    .select("id, prefix, name, last_used_at, created_at")
    .eq("created_by", user.id)
    .order("created_at", { ascending: false });
  return NextResponse.json({ keys: data ?? [] });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const t = tOf(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: t("apiLogin") }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: t("apiIdRequired") }, { status: 400 });

  const { error } = await supabase
    .from("api_keys")
    .delete()
    .eq("id", id)
    .eq("created_by", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
