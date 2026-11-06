import { createClient } from "@/lib/supabase/server";
import LinksTable from "@/components/LinksTable";

export default async function LinksList() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("links")
    .select("slug, target_url, clicks, expires_at, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  return <LinksTable links={data ?? []} />;
}
