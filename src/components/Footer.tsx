import { Rocket, ExternalLink } from 'lucide-react';
import { useLang } from '../lib/i18n';

export default function Footer() {
  const { pick } = useLang();
  const srcs = [
    { label: 'MGS · MOLA MEGDR (megt90n000eb)', href: 'https://pds-geosciences.wustl.edu/missions/mgs/megdr.html' },
    { label: 'Tianwen-1 Global Color Orthomosaic', href: 'https://commons.wikimedia.org/wiki/File:Tianwen-1_Mars_Global_Color_Orthomosaic_(HX1_GRAS_MoRIC_DOM_076m_Global_00N00E_A).png' },
    { label: 'NASA/JPL Mars Exploration Program', href: 'https://mars.nasa.gov/' },
    { label: 'PDS Geosciences Node — Washington University', href: 'https://pds-geosciences.wustl.edu/' },
  ];
  return (
    <footer className="relative border-t border-edge bg-[#07080f]">
      <div className="max-w-[1500px] mx-auto px-5 py-8 grid md:grid-cols-3 gap-6">
        <div>
          <div className="flex items-center gap-2 font-display font-bold text-ink"><Rocket size={16} className="text-ember -rotate-45" /> MARS SURVIVAL GUIDE</div>
          <p className="mt-2 text-[12px] leading-relaxed text-mute max-w-xs">
            {pick(
              'An open mission-planning console for the first crewed Mars expeditions — real MOLA elevations, real imagery, honest risk math.',
              'منصة مفتوحة لتخطيط أولى البعثات المأهولة إلى المريخ — ارتفاعات MOLA حقيقية، صور حقيقية، وحسابات مخاطر صادقة.'
            )}
          </p>
        </div>
        <div>
          <div className="text-[10px] font-mono tracking-[0.2em] text-sand mb-2">DATA SOURCES · المصادر</div>
          <ul className="space-y-1.5">
            {srcs.map(s => (
              <li key={s.href}>
                <a href={s.href} target="_blank" rel="noreferrer" className="text-[11.5px] text-mute hover:text-cyanx transition-colors inline-flex items-center gap-1.5">
                  <ExternalLink size={11} /> {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="md:text-end">
          <div className="text-[10px] font-mono tracking-[0.2em] text-sand mb-2">DISCLAIMER · تنبيه</div>
          <p className="text-[11px] leading-relaxed text-mute max-w-xs md:ms-auto">
            {pick(
              'Engineering-grade visualization, not flight rules. Elevation field: MOLA 16 px/deg; slope derived by central differences. Always validate against raw PDS products before committing a real mission.',
              'تصور هندسي وليس قواعد طيران. حقل الارتفاع: MOLA بدقة 16 بكسل/درجة؛ الانحدار مشتق بالفروق المركزية. تحقق دائمًا من منتجات PDS الخام قبل اعتماد أي مهمة حقيقية.'
            )}
          </p>
        </div>
      </div>
      <div className="border-t border-edge/60 h-8 flex items-center justify-center text-[9.5px] font-mono tracking-[0.25em] text-mute/70">
        SOL 5052 · EACHTO MARS · BUILT WITH NASA OPEN DATA · 2026
      </div>
    </footer>
  );
}
