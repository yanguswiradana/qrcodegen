import { createClient } from "@/lib/supabase/server";
import LinksTable from "@/components/LinksTable";

export default async function LinksList() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("links")
    .select("slug, target_url, clicks, expires_at, created_at, password_hash")
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = (data ?? []).map((l) => ({
    ...l,
    has_password: !!l.password_hash,
    password_hash: undefined,
  }));

  return <LinksTable links={rows} />;
}
