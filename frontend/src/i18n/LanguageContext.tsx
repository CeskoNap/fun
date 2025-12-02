"use client";

import { createContext, useContext, useState, ReactNode, useMemo } from "react";
import { en } from "./en";
import { it } from "./it";

type Language = "en" | "it";

const dictionaries = { en, it };

interface LanguageContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>("en");

  const value = useMemo<LanguageContextValue>(
    () => ({
      lang,
      setLang,
      t: (key: string) => {
        const dict = dictionaries[lang] as any;
        return key.split(".").reduce((acc, part) => (acc ? acc[part] : undefined), dict) ?? key;
      },
    }),
    [lang],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useI18n must be used within LanguageProvider");
  }
  return ctx;
}


