import { createContext, useContext, useMemo, useState } from 'react';
import { translations } from '@/data';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => localStorage.getItem('chooseit_lang') || 'en');
  const value = useMemo(() => ({
    language,
    setLanguage: (next) => {
      localStorage.setItem('chooseit_lang', next);
      setLanguage(next);
    },
    t: (key) => translations[language]?.[key] || translations.en[key] || key,
  }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}

