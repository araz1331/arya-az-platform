import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { type Language, type TranslationKey, t as translate, getStoredLanguage, setStoredLanguage } from "@/lib/i18n";

const COUNTRY_TO_LANG: Record<string, Language> = {
  AZ: "az",
  UZ: "uz",
  KZ: "kk",
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLang] = useState<Language>(getStoredLanguage);

  useEffect(() => {
    const hasStored = typeof window !== "undefined" && localStorage.getItem("arya_lang");
    if (hasStored) return;

    fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(3000) })
      .then(r => r.json())
      .then(data => {
        const code = data?.country_code?.toUpperCase();
        const lang = COUNTRY_TO_LANG[code];
        if (lang) {
          setLang(lang);
          setStoredLanguage(lang);
        }
      })
      .catch(() => {});
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLang(lang);
    setStoredLanguage(lang);
  }, []);

  const t = useCallback((key: TranslationKey) => {
    return translate(language, key);
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
