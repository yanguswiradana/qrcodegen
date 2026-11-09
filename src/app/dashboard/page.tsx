import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import QrStaticForm from "@/components/QrStaticForm";
import QrDynamicForm from "@/components/QrDynamicForm";
import BulkCreate from "@/components/BulkCreate";
import LinksTable from "@/components/LinksTable";
import ScansPanel from "@/components/ScansPanel";
import ScansChart from "@/components/ScansChart";
import ApiKeys from "@/components/ApiKeys";
import AccountData from "@/components/AccountData";
import LocaleToggle from "@/components/LocaleToggle";
import { LocaleProvider } from "@/components/LocaleProvider";
import { getLocale } from "@/lib/locale-server";
import { tx } from "@/lib/i18n";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const locale = await getLocale();
  const t = (k: Parameters<typeof tx>[1]) => tx(locale, k);

  async function logout() {
    "use server";
    const s = await createClient();
    await s.auth.signOut();
    redirect("/login");
  }

  return (
    <LocaleProvider initial={locale}>
      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{t("dashTitle")}</h1>
          <div className="flex gap-2">
            <LocaleToggle />
            <ApiKeys />
            <form action={logout}>
              <button className="qr-btn-ghost text-sm">{t("signOut")}</button>
            </form>
          </div>
        </div>
        <p className="mt-1 text-sm text-zinc-400">{user.email}</p>

        <nav className="mt-4 flex flex-wrap gap-2" aria-label="Navigasi dashboard">
          {[
            ["static", t("navStatic")],
            ["dynamic", t("navDynamic")],
            ["bulk", t("navBulk")],
            ["links", t("navLinks")],
            ["scans", t("navScans")],
            ["account", t("navAccount")],
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
          <h2 className="text-lg font-semibold">{t("navLinks")}</h2>
          <LinksTable />
        </div>

        <div className="mt-8 scroll-mt-6" id="scans">
          <h2 className="text-lg font-semibold">{t("navScans")}</h2>
          <ScansChart />
          <ScansPanel />
        </div>

        <div className="mt-8 scroll-mt-6" id="account">
          <h2 className="text-lg font-semibold">{t("navAccount")}</h2>
          <AccountData />
        </div>
      </main>
    </LocaleProvider>
  );
}
