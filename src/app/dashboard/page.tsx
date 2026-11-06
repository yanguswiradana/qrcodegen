import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import QrStaticForm from "@/components/QrStaticForm";
import QrDynamicForm from "@/components/QrDynamicForm";
import LinksList from "@/components/LinksList";
import ScansPanel from "@/components/ScansPanel";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  async function logout() {
    "use server";
    const s = await createClient();
    await s.auth.signOut();
    redirect("/login");
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <form action={logout}>
          <button className="rounded border px-3 py-1.5 text-sm">Keluar</button>
        </form>
      </div>
      <p className="mt-1 text-sm text-zinc-600">{user.email}</p>

      <div className="mt-6">
        <QrStaticForm />
      </div>

      <div className="mt-6">
        <QrDynamicForm />
      </div>

      <div className="mt-8">
        <h2 className="font-semibold">Short link</h2>
        <LinksList />
      </div>

      <div className="mt-8">
        <h2 className="font-semibold">Scan terakhir</h2>
        <ScansPanel />
      </div>
    </main>
  );
}
