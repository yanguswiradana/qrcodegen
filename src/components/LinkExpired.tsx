import Link from "next/link";
import { getLocale } from "@/lib/locale-server";
import { dateLocale, tx } from "@/lib/i18n";

export default async function LinkExpired({
  slug,
  expiredAt,
}: {
  slug: string;
  expiredAt: string | null;
}) {
  const locale = await getLocale();
  const t = (k: Parameters<typeof tx>[1]) => tx(locale, k);
  return (
    <main className="mx-auto max-w-sm px-6 py-20 text-center">
      <p className="font-mono text-sm text-zinc-400">/r/{slug}</p>
      <h1 className="mt-2 text-xl font-bold">{t("expTitle")}</h1>
      <p className="mt-2 text-sm text-zinc-400">
        {expiredAt
          ? `${t("validUntil")} ${new Date(expiredAt).toLocaleDateString(
              dateLocale(locale),
              { day: "numeric", month: "long", year: "numeric" }
            )}.`
          : t("expiredNow")}{" "}
        {t("printedDead")}
      </p>
      <div className="mt-6">
        <Link href="/" className="qr-btn inline-block">
          {t("makeYours")}
        </Link>
      </div>
    </main>
  );
}
