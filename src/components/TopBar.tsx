import { Link, useLocation } from 'react-router-dom';
import { Languages, Menu, X, Radio } from 'lucide-react';
import { useState } from 'react';
import { useLang } from '../lib/i18n';

export default function TopBar() {
  const { lang, toggle, pick } = useLang();
  const loc = useLocation();
  const [open, setOpen] = useState(false);

  const links = [
    { to: '/', en: 'Overview', ar: 'نظرة عامة' },
    { to: '/planner', en: 'Route Planner', ar: 'مخطط المسار' },
    { to: '/landing-sites', en: 'Landing Sites', ar: 'مواقع الهبوط' },
    { to: '/missions', en: 'Mission Data', ar: 'بيانات المهمات' },
    { to: '/about', en: 'Methodology', ar: 'المنهجية' },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-edge/80 bg-[#070810]/85 backdrop-blur-xl">
      {/* mission clock strip */}
      <div className="hidden md:flex items-center justify-between h-7 px-4 border-b border-edge/50 bg-[#090a13] text-[10px] font-mono tracking-wider text-mute">
        <div className="flex items-center gap-5">
          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-jade pulse-dot" /> DSN-LINK: LOCKED</span>
          <span>MARS SOL <span className="text-ink">5,052</span></span>
          <span>LMST <span className="text-ink">14:22</span></span>
          <span>τ DUST <span className="text-sand">0.42</span></span>
        </div>
        <div className="flex items-center gap-5">
          <span>PERSEVERANCE <span className="text-cyanx">45.22 KM</span> ALL-TIME ROVER RECORD</span>
          <span>MOLA MEGDR v1.1 · 16 px/deg</span>
        </div>
      </div>

      <div className="h-14 flex items-center justify-between px-3 sm:px-5 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-mars to-ember grid place-items-center shadow-[0_0_18px_rgba(232,118,45,0.4)] group-hover:shadow-[0_0_26px_rgba(232,118,45,0.6)] transition-shadow">
              <img src="/favicon.svg.svg" alt="" className="w-6 h-6 object-contain" />
            </div>
            <div className="leading-tight">
              <div className="font-display font-700 text-[15px] sm:text-base font-bold tracking-tight text-ink">
                MARS <span className="text-ember">SURVIVAL</span> GUIDE
              </div>
              <div className="text-[9px] font-mono text-mute tracking-[0.18em] hidden xs:block">دليل البقاء على المريخ</div>
            </div>
          </Link>
        </div>

        <nav className="hidden lg:flex items-center gap-1">
          {links.map(l => {
            const active = loc.pathname === l.to;
            return (
              <Link
                key={l.to}
                to={l.to}
                className={`px-3 py-1.5 rounded-md text-[12.5px] font-medium transition-colors ${
                  active ? 'text-[#ffd9c2] bg-ember/15 border border-ember/40' : 'text-mute hover:text-ink hover:bg-white/5 border border-transparent'
                }`}
              >
                {pick(l.en, l.ar)}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={toggle}
            className="h-9 px-3 rounded-md border border-edge2 bg-panel2 hover:border-ember/60 hover:text-[#ffd9c2] text-mute transition-colors flex items-center gap-1.5 text-[12px] font-semibold"
            aria-label="Toggle language"
          >
            <Languages size={15} />
            <span className="font-mono">{lang === 'en' ? 'AR' : 'EN'}</span>
          </button>
          <Link to="/planner" className="hidden sm:flex h-9 px-4 rounded-md bg-gradient-to-b from-ember to-mars text-[#fff1e4] text-[12px] font-bold tracking-wide items-center gap-1.5 hover:brightness-110 transition shadow-[0_4px_18px_rgba(193,68,14,0.45)]">
            <Radio size={14} strokeWidth={2.5} /> {pick('PLOT ROUTE', 'ارسم مسارًا')}
          </Link>
          <button className="lg:hidden h-9 w-9 grid place-items-center rounded-md border border-edge2 text-ink" onClick={() => setOpen(v => !v)} aria-label="Menu">
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* mobile nav */}
      {open && (
        <div className="lg:hidden border-t border-edge bg-[#0a0b14]/97 backdrop-blur-xl px-4 py-3 grid grid-cols-2 gap-2">
          {links.map(l => (
            <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="px-3 py-2.5 rounded-md border border-edge2 bg-panel2 text-[13px] text-ink">
              {pick(l.en, l.ar)}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
