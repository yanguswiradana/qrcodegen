import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createSessionClient } from "@/lib/supabase/server";

// Hapus SEMUA data milik user (link, QR, key, scan via cascade).
// Baris auth ikut dihapus bila service key dikonfigurasi (sama seperti purge);
// bila tidak, user tetap bisa login (akun kosong) dan hapus manual via dashboard.
export async function DELETE() {
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Login dulu" }, { status: 401 });

  await supabase.from("qr_codes").delete().eq("created_by", user.id);
  await supabase.from("api_keys").delete().eq("created_by", user.id);
  const { error } = await supabase
    .from("links")
    .delete()
    .eq("created_by", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let deletedAuth = false;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey) {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey
    );
    const { error: adminError } = await admin.auth.admin.deleteUser(user.id);
    deletedAuth = !adminError;
  }

  return NextResponse.json({ ok: true, deletedAuth });
}
