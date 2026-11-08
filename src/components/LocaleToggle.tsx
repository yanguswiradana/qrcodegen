"use client";

import { useLocale } from "@/components/LocaleProvider";
import type { Locale } from "@/lib/i18n";

export default function LocaleToggle() {
  const { locale, setLocale } = useLocale();
  return (
    <div
      role="group"
      aria-label="Bahasa / Language"
      className="flex overflow-hidden rounded-lg border border-[var(--line)] text-xs"
    >
      {(["id", "en"] as Locale[]).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLocale(l)}
          aria-pressed={locale === l}
          className={`px-2.5 py-1.5 font-semibold uppercase ${
            locale === l
              ? "bg-[var(--accent)] text-[var(--accent-ink)]"
              : "text-zinc-400 hover:text-[var(--foreground)]"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
