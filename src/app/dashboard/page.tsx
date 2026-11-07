import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import QrStaticForm from "@/components/QrStaticForm";
import QrDynamicForm from "@/components/QrDynamicForm";
import BulkCreate from "@/components/BulkCreate";
import LinksList from "@/components/LinksList";
import ScansPanel from "@/components/ScansPanel";
import ScansChart from "@/components/ScansChart";
import ApiKeys from "@/components/ApiKeys";

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
        <div className="flex gap-2">
          <ApiKeys />
          <form action={logout}>
            <button className="qr-btn-ghost text-sm">Keluar</button>
          </form>
        </div>
      </div>
      <p className="mt-1 text-sm text-zinc-400">{user.email}</p>

      <nav className="mt-4 flex flex-wrap gap-2" aria-label="Navigasi dashboard">
        {[
          ["static", "Statis"],
          ["dynamic", "Dinamis"],
          ["bulk", "Bulk"],
          ["links", "Short link"],
          ["scans", "Scan"],
        ].map(([id, label]) => (
          <a key={id} href={`#${id}`} className="qr-btn-ghost px-3 py-1.5 text-xs">
            {label}
          </a>
        ))}
      </nav>

      <div className="mt-6 scroll-mt-6" id="static">
        <QrStaticForm />
      </div>

      <div className="mt-6 scroll-mt-6" id="dynamic">
        <QrDynamicForm />
      </div>

      <div className="mt-6 scroll-mt-6" id="bulk">
        <BulkCreate />
      </div>

      <div className="mt-8 scroll-mt-6" id="links">
        <h2 className="text-lg font-semibold">Short link</h2>
        <LinksList />
      </div>

      <div className="mt-8 scroll-mt-6" id="scans">
        <h2 className="text-lg font-semibold">Scan terakhir</h2>
        <ScansChart />
        <ScansPanel />
      </div>
    </main>
  );
}
