import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function RedirectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: link } = await supabase
    .from("links")
    .select("id, target_url, clicks")
    .eq("slug", slug)
    .single();

  if (!link) redirect("/");

  await supabase
    .from("links")
    .update({ clicks: (link.clicks ?? 0) + 1 })
    .eq("id", link.id);

  redirect(link.target_url);
}
