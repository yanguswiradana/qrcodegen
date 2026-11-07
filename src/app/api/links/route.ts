import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { genSlug } from "@/lib/slug";

import { createHash } from "node:crypto";

const ALIAS_RE = /^[a-zA-Z0-9_-]{3,32}$/;

async function sha256(s: string) {
  return createHash("sha256").update(s).digest("hex");
}

export async function POST(request: Request) {
  const supabase = await createClient();
  let userId: string | null = null;

  // Auth: Bearer API key ATAU sesi login.
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  let apiKey: string | null = null;
  if (bearer) {
    const { data: uid } = await supabase.rpc("auth_api_key", { p_key: bearer });
    userId = (uid as string) ?? null;
    if (!userId) return NextResponse.json({ error: "API key salah" }, { status: 401 });
    apiKey = bearer;
  } else {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Login dulu" }, { status: 401 });
    userId = user.id;
  }

  const body = await request.json().catch(() => null);
  const targetUrl = body?.target_url?.trim();
  const name = body?.name?.trim() || null;
  const alias = body?.alias?.trim() || null;
  const expiresAt = body?.expires_at?.trim() || null;
  const password = body?.password?.trim() || null;

  // Jalur API key: seluruh create lewat RPC definer karena anon tanpa JWT
  // ditolak RLS (INSERT links). Validasi + rate limit ada di dalam RPC.
  if (apiKey) {
    if (expiresAt && isNaN(new Date(expiresAt).getTime())) {
      return NextResponse.json({ error: "Expiry tidak valid" }, { status: 400 });
    }
    const { data } = await supabase.rpc("api_create_link", {
      p_key: apiKey,
      p_target_url: body?.target_url ?? null,
      p_alias: alias,
      p_expires_at: expiresAt,
      p_password: password,
      p_name: name,
    });
    const r = (data ?? {}) as { ok?: boolean; slug?: string; code?: string };
    if (!r.ok) {
      const map: Record<string, [string, number]> = {
        bad_key: ["API key salah", 401],
        invalid_url: ["URL tidak valid", 400],
        blocked: ["Domain diblokir", 403],
        rate_limited: ["Batas 20 link/jam, coba lagi nanti", 429],
        alias_invalid: ["Alias 3-32 char: huruf, angka, - _ saja", 400],
        alias_taken: ["Alias sudah dipakai", 409],
        expiry_invalid: ["Expiry harus tanggal masa depan", 400],
      };
      const [error, status] = map[r.code ?? ""] ?? ["Gagal", 500];
      return NextResponse.json({ error }, { status });
    }
    return NextResponse.json({ slug: r.slug });
  }

  try {
    new URL(targetUrl);
  } catch {
    return NextResponse.json({ error: "URL tidak valid" }, { status: 400 });
  }

  // Blocklist: tolak host berbahaya / shortener loop.
  try {
    const host = new URL(targetUrl).hostname.toLowerCase().replace(/^www\./, "");
    const { data: blocked } = await supabase
      .from("blocked_hosts")
      .select("host")
      .eq("host", host)
      .maybeSingle();
    if (blocked)
      return NextResponse.json({ error: "Domain diblokir" }, { status: 403 });
  } catch {
    /* URL sudah divalidasi di atas */
  }

  // Rate limit: 20 create/jam per user.
  // Jalur API key memakai check_rate_key (key diverifikasi di dalam RPC,
  // bucket dibangun dari uid hasil verifikasi sehingga tak bisa dipalsukan).
  const { data: allowed } = apiKey
    ? await supabase.rpc("check_rate_key", {
        p_key: apiKey,
        p_limit: 20,
        p_window_secs: 3600,
      })
    : await supabase.rpc("check_rate", {
        p_key: `create:${userId}`,
        p_limit: 20,
        p_window_secs: 3600,
      });
  if (allowed === false)
    return NextResponse.json(
      { error: "Batas 20 link/jam, coba lagi nanti" },
      { status: 429 }
    );

  if (alias && !ALIAS_RE.test(alias)) {
    return NextResponse.json(
      { error: "Alias 3-32 char: huruf, angka, - _ saja" },
      { status: 400 }
    );
  }

  let expires_at: string | null = null;
  if (expiresAt) {
    const d = new Date(expiresAt);
    if (isNaN(d.getTime()) || d <= new Date()) {
      return NextResponse.json(
        { error: "Expiry harus tanggal masa depan" },
        { status: 400 }
      );
    }
    expires_at = d.toISOString();
  }

  async function create(slug: string) {
    const { data, error } = await supabase
      .from("links")
      .insert({
        slug,
        target_url: targetUrl,
        expires_at,
        password_hash: password
          ? await sha256(password)
          : null,
        created_by: userId!,
      })
      .select("id, slug")
      .single();
    if (error || !data) return { error };
    await supabase.from("qr_codes").insert({
      type: "dynamic",
      link_id: data.id,
      payload: data.slug,
      name,
      created_by: userId!,
    });
    return { slug: data.slug };
  }

  // Custom alias: sekali coba, 409 kalau bentrok.
  if (alias) {
    const r = await create(alias);
    if (r.error) {
      if (String(r.error.message).includes("duplicate"))
        return NextResponse.json({ error: "Alias sudah dipakai" }, { status: 409 });
      return NextResponse.json({ error: r.error.message }, { status: 500 });
    }
    return NextResponse.json({ slug: r.slug });
  }

  for (let i = 0; i < 5; i++) {
    const r = await create(genSlug(7));
    if (r.slug) return NextResponse.json({ slug: r.slug });
    if (r.error && !String(r.error.message).includes("duplicate")) {
      return NextResponse.json({ error: r.error.message }, { status: 500 });
    }
  }
  return NextResponse.json({ error: "Slug bentrok, coba lagi" }, { status: 500 });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Login dulu" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const slug = body?.slug?.trim();
  if (!slug) return NextResponse.json({ error: "slug wajib" }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (body.target_url !== undefined) {
    const t = String(body.target_url).trim();
    try {
      new URL(t);
    } catch {
      return NextResponse.json({ error: "URL tidak valid" }, { status: 400 });
    }
    patch.target_url = t;
  }
  if (body.expires_at !== undefined) {
    const raw = String(body.expires_at ?? "").trim();
    if (!raw) patch.expires_at = null;
    else {
      const d = new Date(raw);
      if (isNaN(d.getTime()))
        return NextResponse.json({ error: "Expiry tidak valid" }, { status: 400 });
      patch.expires_at = d.toISOString();
    }
  }
  if (body.password !== undefined) {
    const pw = String(body.password ?? "").trim();
    patch.password_hash = pw ? await sha256(pw) : null;
  }
  if (Object.keys(patch).length === 0)
    return NextResponse.json({ error: "Tidak ada perubahan" }, { status: 400 });

  const { error } = await supabase
    .from("links")
    .update(patch)
    .eq("slug", slug)
    .eq("created_by", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Login dulu" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug")?.trim();
  if (!slug) return NextResponse.json({ error: "slug wajib" }, { status: 400 });

  // Hapus qr_codes dynamic yang menunjuk link ini dulu (FK set null auto, tapi bersihkan).
  const { data: link } = await supabase
    .from("links")
    .select("id")
    .eq("slug", slug)
    .eq("created_by", user.id)
    .single();
  if (!link) return NextResponse.json({ error: "Tidak ketemu" }, { status: 404 });

  await supabase.from("qr_codes").delete().eq("link_id", link.id);
  const { error } = await supabase.from("links").delete().eq("id", link.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function GET(request: Request) {
  const supabase = await createClient();
  let userId: string | null = null;

  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (bearer) {
    // Jalur API key lewat RPC definer (anon tanpa JWT dibatasi RLS).
    const { data } = await supabase.rpc("api_list_links", { p_key: bearer });
    const rows = (data ?? []) as unknown[];
    if (rows.length === 0) {
      const { data: uid } = await supabase.rpc("auth_api_key", { p_key: bearer });
      if (!(uid as string)) {
        return NextResponse.json({ error: "API key salah" }, { status: 401 });
      }
    }
    return NextResponse.json({ links: rows });
  } else {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Login dulu" }, { status: 401 });
    userId = user.id;
  }

  const { data } = await supabase
    .from("links")
    .select("slug, target_url, clicks, expires_at, created_at")
    .eq("created_by", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  return NextResponse.json({ links: data ?? [] });
}
