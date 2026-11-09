import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { genSlug } from "@/lib/slug";
import { LOCALE_COOKIE, tx, type Locale, type MsgKey } from "@/lib/i18n";

import { createHash } from "node:crypto";

const ALIAS_RE = /^[a-zA-Z0-9_-]{3,32}$/;

async function sha256(s: string) {
  return createHash("sha256").update(s).digest("hex");
}

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

export async function POST(request: Request) {
  const supabase = await createClient();
  const t = tOf(request);
  let userId: string | null = null;

  // Auth: Bearer API key ATAU sesi login.
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  let apiKey: string | null = null;
  if (bearer) {
    const { data: uid } = await supabase.rpc("auth_api_key", { p_key: bearer });
    userId = (uid as string) ?? null;
    if (!userId) return NextResponse.json({ error: t("apiBadKey") }, { status: 401 });
    apiKey = bearer;
  } else {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: t("apiLogin") }, { status: 401 });
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
      return NextResponse.json({ error: t("apiExpiryInvalid") }, { status: 400 });
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
        bad_key: [t("apiBadKey"), 401],
        invalid_url: [t("apiUrlInvalid"), 400],
        blocked: [t("apiBlocked"), 403],
        rate_limited: [t("apiRateLimit"), 429],
        alias_invalid: [t("errBadAlias"), 400],
        alias_taken: [t("apiAliasTaken"), 409],
        expiry_invalid: [t("apiExpiryFuture"), 400],
      };
      const [error, status] = map[r.code ?? ""] ?? [t("apiFailed"), 500];
      return NextResponse.json({ error }, { status });
    }
    return NextResponse.json({ slug: r.slug });
  }

  try {
    new URL(targetUrl);
  } catch {
    return NextResponse.json({ error: t("apiUrlInvalid") }, { status: 400 });
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
      return NextResponse.json({ error: t("apiBlocked") }, { status: 403 });
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
      { error: t("apiRateLimit") },
      { status: 429 }
    );

  if (alias && !ALIAS_RE.test(alias)) {
    return NextResponse.json(
      { error: t("errBadAlias") },
      { status: 400 }
    );
  }

  let expires_at: string | null = null;
  if (expiresAt) {
    const d = new Date(expiresAt);
    if (isNaN(d.getTime()) || d <= new Date()) {
      return NextResponse.json(
        { error: t("apiExpiryFuture") },
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
        return NextResponse.json({ error: t("apiAliasTaken") }, { status: 409 });
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
  const t = tOf(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: t("apiLogin") }, { status: 401 });

  const body = await request.json().catch(() => null);
  const slug = body?.slug?.trim();
  if (!slug) return NextResponse.json({ error: t("apiSlugRequired") }, { status: 400 });

  const patch: Record<string, unknown> = {};
  if (body.target_url !== undefined) {
    const tu = String(body.target_url).trim();
    try {
      new URL(tu);
    } catch {
      return NextResponse.json({ error: t("apiUrlInvalid") }, { status: 400 });
    }
    patch.target_url = tu;
  }
  if (body.expires_at !== undefined) {
    const raw = String(body.expires_at ?? "").trim();
    if (!raw) patch.expires_at = null;
    else {
      const d = new Date(raw);
      if (isNaN(d.getTime()))
        return NextResponse.json({ error: t("apiExpiryInvalid") }, { status: 400 });
      patch.expires_at = d.toISOString();
    }
  }
  if (body.password !== undefined) {
    const pw = String(body.password ?? "").trim();
    patch.password_hash = pw ? await sha256(pw) : null;
  }
  // Rename alias: validasi format, milik sendiri, dan tidak bentrok.
  if (body.new_slug !== undefined) {
    const ns = String(body.new_slug ?? "").trim();
    if (ns && ns !== slug) {
      if (!ALIAS_RE.test(ns)) {
        return NextResponse.json(
          { error: t("errBadAlias") },
          { status: 400 }
        );
      }
      const { data: own } = await supabase
        .from("links")
        .select("id")
        .eq("slug", slug)
        .eq("created_by", user.id)
        .maybeSingle();
      if (!own) return NextResponse.json({ error: t("apiNotFound") }, { status: 404 });
      const { data: clash } = await supabase
        .from("links")
        .select("id")
        .eq("slug", ns)
        .maybeSingle();
      if (clash)
        return NextResponse.json({ error: t("apiAliasTaken") }, { status: 409 });
      patch.slug = ns;
    }
  }
  if (Object.keys(patch).length === 0)
    return NextResponse.json({ error: t("apiNoChange") }, { status: 400 });

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
  const t = tOf(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: t("apiLogin") }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug")?.trim();
  if (!slug) return NextResponse.json({ error: t("apiSlugRequired") }, { status: 400 });

  // Hapus qr_codes dynamic yang menunjuk link ini dulu (FK set null auto, tapi bersihkan).
  const { data: link } = await supabase
    .from("links")
    .select("id")
    .eq("slug", slug)
    .eq("created_by", user.id)
    .single();
  if (!link) return NextResponse.json({ error: t("apiNotFound") }, { status: 404 });

  await supabase.from("qr_codes").delete().eq("link_id", link.id);
  const { error } = await supabase.from("links").delete().eq("id", link.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const t = tOf(request);

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim().slice(0, 100);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const perPage = Math.min(
    200,
    Math.max(1, parseInt(searchParams.get("per_page") ?? "50", 10) || 50)
  );
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;
  // Escape wildcard untuk pola ilike PostgREST.
  const esc = q.replace(/[\\%]/g, (c) => `\\${c}`);

  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (bearer) {
    // Jalur API key lewat RPC definer (anon tanpa JWT dibatasi RLS).
    const { data } = await supabase.rpc("api_list_links", {
      p_key: bearer,
      p_query: q,
      p_page: page,
      p_per_page: perPage,
    });
    const r = (data ?? {}) as {
      ok?: boolean;
      links?: unknown[];
      total?: number;
    };
    if (!r.ok) {
      return NextResponse.json({ error: t("apiBadKey") }, { status: 401 });
    }
    return NextResponse.json({ links: r.links ?? [], total: r.total ?? 0 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: t("apiLogin") }, { status: 401 });

  let query = supabase
    .from("links")
    .select("slug, target_url, clicks, expires_at, created_at", { count: "exact" })
    .eq("created_by", user.id)
    .order("created_at", { ascending: false })
    .range(from, to);
  if (esc) {
    query = query.or(`slug.ilike.%${esc}%,target_url.ilike.%${esc}%`);
  }
  const { data, count } = await query;
  return NextResponse.json({ links: data ?? [], total: count ?? 0 });
}
