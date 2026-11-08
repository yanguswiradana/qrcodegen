import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Vercel Cron harian (vercel.json) → hapus scan >3 bulan.
// Guard berlapis: CRON_SECRET (Vercel mengirimnya otomatis sebagai
// Authorization Bearer) + service key (satu-satunya yang boleh eksekusi
// RPC tanpa grant publik). Tanpa keduanya: 503, data tak tersentuh.
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!cronSecret || !serviceKey) {
    return NextResponse.json({ error: "Purge tidak dikonfigurasi" }, { status: 503 });
  }

  const auth = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (auth !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey
  );
  const { data, error } = await supabase.rpc("purge_old_scans", { p_months: 3 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ purged: data ?? 0 });
}
