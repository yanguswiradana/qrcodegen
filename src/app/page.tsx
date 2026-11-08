import FreeQrGate from "@/components/FreeQrGate";
import LocaleToggle from "@/components/LocaleToggle";
import { LocaleProvider } from "@/components/LocaleProvider";
import { getLocale } from "@/lib/locale-server";
import { tx } from "@/lib/i18n";

export default async function Home() {
  const locale = await getLocale();
  const t = (k: Parameters<typeof tx>[1]) => tx(locale, k);
  return (
    <LocaleProvider initial={locale}>
      <main className="mx-auto w-full max-w-3xl px-6 py-16 sm:py-24">
        <div className="flex items-center justify-between gap-2">
          <p className="inline-block rounded-full border border-lime-300/30 bg-lime-300/10 px-3 py-1 text-xs text-lime-200">
            {t("badge")}
          </p>
          <LocaleToggle />
        </div>
        <h1 className="mt-4 text-4xl font-bold leading-tight sm:text-5xl">
          {t("heroA")}
          <br />
          <span className="text-lime-300">{t("heroB")}</span>
        </h1>
        <p className="mt-4 max-w-xl text-zinc-400">{t("heroSub")}</p>

        <FreeQrGate />

        <div className="mt-12 grid gap-3 sm:grid-cols-3">
          {[
            [t("cardStaticT"), t("cardStaticD")],
            [t("cardDynT"), t("cardDynD")],
            [t("cardTrackT"), t("cardTrackD")],
          ].map(([title, desc]) => (
            <div key={title} className="qr-card p-4">
              <p className="font-semibold text-lime-200">{title}</p>
              <p className="mt-1 text-sm text-zinc-400">{desc}</p>
            </div>
          ))}
        </div>

        <p className="mt-10 text-sm text-zinc-500">
          {t("oss")}{" "}
          <a
            href="https://github.com/yanguswiradana/qrcodegen"
            className="underline underline-offset-4"
            target="_blank"
          >
            github.com/yanguswiradana/qrcodegen
          </a>
        </p>
      </main>
    </LocaleProvider>
  );
}
