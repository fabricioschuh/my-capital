'use client';

import { createContext, useContext, ReactNode } from 'react';
import { ptBr } from './translations/pt-br';

interface I18nContextValue {
  t: (key: keyof typeof ptBr, replacements?: Record<string, string>) => string;
}

const I18nContext = createContext<I18nContextValue>({
  t: (key) => key as string,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const t = (key: keyof typeof ptBr, replacements?: Record<string, string>): string => {
    let value: string = ptBr[key] ?? (key as string);
    if (replacements) {
      for (const [k, v] of Object.entries(replacements)) {
        value = value.replace(`{${k}}`, v);
      }
    }
    return value;
  };

  return (
    <I18nContext.Provider value={{ t }}>
      {children}
    </I18nContext.Provider>
  );
}

export const useI18n = () => useContext(I18nContext);
