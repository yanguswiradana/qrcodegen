"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  LOCALE_COOKIE,
  tx,
  type Locale,
  type MsgKey,
} from "@/lib/i18n";

type Ctx = { locale: Locale; setLocale: (l: Locale) => void };

const LocaleCtx = createContext<Ctx>({ locale: "id", setLocale: () => {} });

function readCookie(): Locale {
  if (typeof document === "undefined") return "id";
  const m = document.cookie.match(/(?:^|; )qrgen_locale=(id|en)/);
  return m ? (m[1] as Locale) : "id";
}

export function LocaleProvider({
  initial,
  children,
}: {
  initial: Locale;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(initial);

  // Sinkronkan cookie (sumber utama) setelah mount, via callback agar lolos lint.
  useEffect(() => {
    const id = setTimeout(() => setLocaleState(readCookie()), 0);
    return () => clearTimeout(id);
  }, []);

  const setLocale = useCallback(
    (l: Locale) => {
      setLocaleState(l);
      document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000`;
      try {
        localStorage.setItem(LOCALE_COOKIE, l);
      } catch {
        /* abaikan */
      }
      router.refresh();
    },
    [router]
  );

  return (
    <LocaleCtx.Provider value={{ locale, setLocale }}>
      {children}
    </LocaleCtx.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleCtx);
}

export function useT() {
  const { locale } = useLocale();
  return useCallback(
    (key: MsgKey, vars?: Record<string, string | number>) =>
      tx(locale, key, vars),
    [locale]
  );
}
