import { Link } from 'react-router-dom';
import {
  Bot, Trophy, Radio, Satellite, Calendar, Ruler, Mountain, ChevronRight,
  Camera, FlaskConical, CircleDot, ExternalLink, Plane
} from 'lucide-react';
import { useLang } from '../lib/i18n';

const ROVERS = [
  { name: 'Perseverance', ar: 'المثابرة', agency: 'NASA · JPL', landed: 'Feb 18, 2021', site: 'Jezero Crater', dist: 45.22, status: 'ACTIVE', statusTone: 'jade', sol: 2006, note: 'Off-world driving record — set Oct 11, 2026, passing Opportunity. 33 sample tubes cached.', noteAr: 'الرقم القياسي العالمي للقيادة خارج الأرض — سُجل في 11 أكتوبر 2026. خزّن 33 أنبوبة عينات.' },
  { name: 'Curiosity', ar: 'الفضول', agency: 'NASA · JPL', landed: 'Aug 6, 2012', site: 'Gale Crater', dist: 36.86, status: 'ACTIVE', statusTone: 'jade', sol: 5052, note: 'Climbing Mount Sharp; drilled 42 rock samples. Climbed 740 m in elevation since landing.', noteAr: 'يتسلق جبل شارب؛ حفر 42 عينة صخرية وصعد 740 م عن موقع هبوطه.' },
  { name: 'Opportunity', ar: 'الفرصة', agency: 'NASA · JPL', landed: 'Jan 25, 2004', site: 'Meridiani Planum', dist: 45.16, status: 'COMPLETE · 2018', statusTone: 'mute', sol: 5111, note: 'The little rover that could — 28 miles over 14 years. Lost to the global dust storm of 2018.', noteAr: 'العربة التي «تستطيع» — 28 ميلاً عبر 14 عامًا. فُقدت في عاصفة الغبار العالمية 2018.' },
  { name: 'Spirit', ar: 'الروح', agency: 'NASA · JPL', landed: 'Jan 4, 2004', site: 'Gusev Crater', dist: 7.73, status: 'COMPLETE · 2010', statusTone: 'mute', sol: 2208, note: 'Trapped in soft soil at Troy. Last communication March 22, 2010.', noteAr: 'عُلقت في تربة رخوة عند تروي. آخر اتصال 22 مارس 2010.' },
  { name: 'Zhurong', ar: 'زورونغ', agency: 'CNSA', landed: 'May 15, 2021', site: 'Utopia Planitia', dist: 1.921, status: 'HIBERNATION', statusTone: 'amber', sol: 356, note: 'China\'s first rover. Hibernated May 2022 for winter; never woke.', noteAr: 'أول مركبة صينية. دخلت سباتًا شتويًا في مايو 2022 ولم تستيقظ.' },
  { name: 'Sojourner', ar: 'سوجورنر', agency: 'NASA · JPL', landed: 'Jul 4, 1997', site: 'Ares Vallis', dist: 0.100, status: 'COMPLETE · 1997', statusTone: 'mute', sol: 83, note: 'First wheeled vehicle on another planet. Pathfinder technology demonstrator.', noteAr: 'أول مركبة بعجلات على كوكب آخر. مسبار تقني لـ Pathfinder.' },
];

const ORBITERS = [
  { name: 'Mars Global Surveyor', years: '1996–2006', payload: 'MOLA altimeter · MOC camera', legacy: 'Built the definitive global DEM — the elevation engine inside this console.' },
  { name: '2001 Mars Odyssey', years: '2001–present', payload: 'THEMIS thermal IR · GRS', legacy: 'Longest-serving spacecraft at Mars. Discovered subsurface water ice signatures.' },
  { name: 'Mars Express (ESA)', years: '2003–present', payload: 'HRSC stereo camera · MARSIS radar', legacy: 'Maps water ice and buried structures; HRSC topography at 20 m/px.' },
  { name: 'Mars Reconnaissance Orbiter', years: '2006–present', payload: 'HiRISE · CTX · SHARAD radar', legacy: 'HiRISE images at 25 cm/px — the sharpest planetary imagery ever. 100 TB to date.' },
  { name: 'MAVEN', years: '2014–present', payload: 'Atmospheric escape spectrometers', legacy: 'Explains how Mars lost its atmosphere — and why it is the way it is.' },
  { name: 'Tianwen-1 (CNSA)', years: '2021–present', payload: 'MoRIC camera · HiRIC · MOSIR', legacy: 'Captured the 76 m/px global color orthomosaic used as this globe\'s skin.' },
];

const MAX_DIST = 50;

export default function Missions() {
  const { pick } = useLang();
  return (
    <div className="bg-abyss min-h-full">
      <div className="border-b border-edge bg-[#0a0b14] blueprint-grid">
        <div className="max-w-[1500px] mx-auto px-5 sm:px-8 py-10">
          <div className="text-[10px] font-mono tracking-[0.3em] text-ember">MISSION ARCHIVE · 1960–2026</div>
          <h1 className="font-display font-bold text-3xl sm:text-5xl tracking-tight mt-2 max-w-3xl">Every wheel that ever <span className="text-ember">turned on Mars</span></h1>
          <p className="mt-2 text-[13px] text-mute max-w-lg">{pick('Operational record of every surface mission, plus the orbiters that mapped the ground they drove on — with the numbers that drove this console’s risk model.', 'السجل التشغيلي لكل مهمة سطحية، بالإضافة إلى المدارات التي رسمت الأرض التي سارت عليها — مع الأرقام التي قادت نموذج المخاطر في هذه المنصة.')}</p>
        </div>
      </div>

      <div className="max-w-[1500px] mx-auto px-5 sm:px-8 py-10 grid lg:grid-cols-12 gap-8">
        {/* ============ rover odometer league table ============ */}
        <div className="lg:col-span-7">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-xl flex items-center gap-2"><Trophy size={18} className="text-sand" /> Rover Odometer League</h2>
            <span className="text-[9px] font-mono text-mute">UPDATED 2026-10-22</span>
          </div>
          <div className="space-y-2">
            {ROVERS.map(r => {
              const pct = Math.min(100, (r.dist / MAX_DIST) * 100);
              const active = r.status === 'ACTIVE';
              return (
                <div key={r.name} className={`panel rounded-xl p-3.5 flex items-center gap-4 ${active ? 'border-jade/30' : ''}`}>
                  <div className={`w-11 h-11 rounded-lg grid place-items-center shrink-0 ${active ? 'bg-jade/15 text-jade' : 'bg-white/5 text-mute'}`}>
                    <Bot size={21} strokeWidth={1.6} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <span className="font-display font-bold text-[13.5px] text-ink">{r.name}</span>
                      <span className="font-arabic text-[10px] text-mute">{r.ar}</span>
                      <span className="text-[8.5px] font-mono text-mute">{r.agency}</span>
                      <span className={`ms-auto text-[8px] font-mono px-1.5 py-0.5 rounded ${active ? 'bg-jade/15 text-jade' : 'bg-white/5 text-mute'}`}>{r.status}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-full bg-edge overflow-hidden">
                        <div className={`h-full rounded-full ${active ? 'bg-gradient-to-r from-jade/70 to-jade' : 'bg-mute/50'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="font-mono text-[10.5px] font-semibold text-ink tabular-nums shrink-0">{r.dist.toFixed(2)} km</span>
                    </div>
                    <div className="mt-1 text-[8px] font-mono text-mute">{r.landed.toUpperCase()} · {r.site.toUpperCase()} · SOL {r.sol}</div>
                    <p className="mt-1 text-[9.5px] leading-snug text-ink/75">{pick(r.note, r.noteAr)}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* records */}
          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { icon: Plane, v: '45.22 km', l: 'OFF-WORLD DRIVING', s: 'PERSEVERANCE · 2026' },
              { icon: Calendar, v: '5,052', l: 'SOLS OPERATED', s: 'CURIOSITY · 2012–NOW' },
              { icon: FlaskConical, v: '33', l: 'SAMPLES CACHED', s: 'PERSEVERANCE · JEZERO' },
              { icon: Ruler, v: '18', l: 'SUCCESSFUL LANDINGS', s: 'OF 26 ATTEMPTS EVER' },
            ].map((s, i) => {
              const I = s.icon;
              return (
                <div key={i} className="panel-inset rounded-xl p-3 text-center">
                  <I size={15} className="text-sand mx-auto mb-1.5" />
                  <div className="font-display font-bold text-base text-ink">{s.v}</div>
                  <div className="text-[7.5px] font-mono tracking-widest text-mute mt-0.5">{s.l}</div>
                  <div className="text-[6.5px] font-mono text-mute/60 mt-0.5">{s.s}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ============ orbiters ============ */}
        <div className="lg:col-span-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-xl flex items-center gap-2"><Satellite size={18} className="text-cyanx" /> The Eyes Above</h2>
            <span className="text-[9px] font-mono text-mute">6 ACTIVE / PAST ASSETS</span>
          </div>
          <div className="space-y-2">
            {ORBITERS.map(o => (
              <div key={o.name} className="panel rounded-xl p-3.5 flex gap-3">
                <div className="w-1 rounded-full bg-gradient-to-b from-cyanx/70 to-transparent shrink-0" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-display font-semibold text-[12.5px] text-ink">{o.name}</span>
                    <span className="text-[8.5px] font-mono text-cyanx">{o.years}</span>
                  </div>
                  <div className="text-[8px] font-mono text-mute mt-0.5">{o.payload.toUpperCase()}</div>
                  <p className="text-[9.5px] leading-snug text-ink/75 mt-1.5">{o.legacy}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 panel rounded-xl p-4 border-ember/30">
            <div className="text-[9px] font-mono tracking-[0.25em] text-ember flex items-center gap-2"><Camera size={12} /> WHY THIS CONSOLE EXISTS</div>
            <p className="mt-2 text-[11px] leading-relaxed text-ink/85">
              {pick(
                'Every layer in the 3D globe is a real orbital product. Every slope statistic on the analysis panel is computed from the actual MOLA elevation field at 18 km sampling. This is not a mock-up — it is the same data NASA JPL uses when they choose a rover ellipse.',
                'كل طبقة في الكرة ثلاثية الأبعاد هي منتج مداري حقيقي. كل إحصائية انحدار في لوحة التحليل محسوبة من حقل ارتفاع MOLA الفعلي بأخذ عينات كل 18 كم. هذه ليست محاكاة — إنها نفس البيانات التي يستخدمها ناسا JPL عند اختيار قطع هبوط العربات.'
              )}
            </p>
            <a href="https://pds-geosciences.wustl.edu/missions/mgs/megdr.html" target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-[10px] font-mono text-cyanx hover:underline">
              MGS-M-MOLA-5-MEGDR-L3-V1.0 <ExternalLink size={10} />
            </a>
          </div>

          <Link to="/planner" className="mt-4 h-11 w-full rounded-lg border border-cyanx/45 bg-cyanx/10 text-cyanx font-bold text-[11px] tracking-widest flex items-center justify-center gap-2 hover:bg-cyanx/20 transition-colors">
            PLOT A ROUTE ACROSS THIS TERRAIN <ChevronRight size={15} />
          </Link>
        </div>
      </div>
    </div>
  );
}
