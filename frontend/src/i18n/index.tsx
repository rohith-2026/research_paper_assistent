/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getStoredSettings, SETTINGS_KEY } from "../utils/settings";
import { Lang, STRINGS } from "./strings";
import { applyDomTranslations } from "./dom";

type I18nContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
};

const I18nContext = createContext<I18nContextValue>({
  lang: "en",
  setLang: () => undefined,
  t: (key) => key,
});

const detectLang = (): Lang => {
  if (typeof navigator === "undefined") return "en";
  const raw = navigator.language.toLowerCase();
  if (raw.startsWith("hi")) return "hi";
  if (raw.startsWith("te")) return "te";
  return "en";
};

export function I18nProvider({ children }: { children: ReactNode }) {
  const stored = getStoredSettings()?.language as Lang | undefined;
  const [lang, setLang] = useState<Lang>(stored || detectLang());
  const observerRef = useRef<MutationObserver | null>(null);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = lang;
    document.documentElement.dataset.lang = lang;
    applyDomTranslations("en");
    if (lang !== "en") {
      applyDomTranslations(lang);
    }
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    return undefined;
  }, [lang]);

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key !== SETTINGS_KEY || !e.newValue) return;
      try {
        const parsed = JSON.parse(e.newValue) as { language?: Lang };
        if (parsed.language && parsed.language !== lang) {
          setLang(parsed.language);
        }
      } catch {
        // ignore
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [lang]);

  const t = useMemo(() => {
    return (key: string) => {
      const dict = STRINGS[lang] || {};
      if (dict[key]) return dict[key];
      return key;
    };
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
