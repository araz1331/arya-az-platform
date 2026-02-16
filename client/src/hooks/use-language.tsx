import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { type Language, type TranslationKey, t as translate, getStoredLanguage, setStoredLanguage } from "@/lib/i18n";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLang] = useState<Language>(getStoredLanguage);

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
