'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { en } from './translations/en';
import { ptBr } from './translations/pt-br';

export type Locale = 'en' | 'pt-BR';

const translations: Record<Locale, typeof en> = { en, 'pt-BR': ptBr };

const COOKIE_NAME = 'locale';

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: keyof typeof en, replacements?: Record<string, string>) => string;
}

const I18nContext = createContext<I18nContextValue>({
  locale: 'en',
  setLocale: () => {},
  t: (key) => key as string,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    const cookie = document.cookie
      .split('; ')
      .find((r) => r.startsWith(`${COOKIE_NAME}=`));
    if (cookie) {
      const value = cookie.split('=')[1] as Locale;
      if (value === 'en' || value === 'pt-BR') {
        setLocaleState(value);
      }
    }
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    document.cookie = `${COOKIE_NAME}=${l}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
  };

  const t = (key: keyof typeof en, replacements?: Record<string, string>): string => {
    const dict = translations[locale];
    let value: string = dict[key] ?? translations.en[key] ?? (key as string);
    if (replacements) {
      for (const [k, v] of Object.entries(replacements)) {
        value = value.replace(`{${k}}`, v);
      }
    }
    return value;
  };

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useI18n = () => useContext(I18nContext);
