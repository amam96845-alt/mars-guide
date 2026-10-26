import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Lang = 'en' | 'ar';

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggle: () => void;
  pick: (en: string, ar: string) => string;
  dir: 'ltr' | 'rtl';
}

const Ctx = createContext<LangCtx | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try { return (localStorage.getItem('msg-lang') as Lang) || 'en'; } catch { return 'en'; }
  });

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.body.style.fontFamily = lang === 'ar'
      ? '"Noto Kufi Arabic","IBM Plex Sans",system-ui,sans-serif'
      : '"IBM Plex Sans","Noto Kufi Arabic",system-ui,sans-serif';
    try { localStorage.setItem('msg-lang', lang); } catch { /* noop */ }
  }, [lang]);

  const setLang = (l: Lang) => setLangState(l);
  const toggle = () => setLangState(p => (p === 'en' ? 'ar' : 'en'));
  const pick = (en: string, ar: string) => (lang === 'ar' ? ar : en);
  return <Ctx.Provider value={{ lang, setLang, toggle, pick, dir: lang === 'ar' ? 'rtl' : 'ltr' }}>{children}</Ctx.Provider>;
}

export function useLang() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useLang outside provider');
  return c;
}
