import { Link } from 'react-router-dom';
import {
  Rocket, ChevronRight, Mountain, Thermometer, Satellite, Radar, Gauge,
  ShieldCheck, ArrowDown, AlertTriangle, Ruler, Clock, TrendingUp, Globe,
  Database, CircleDot, Wind, Sun, Droplets
} from 'lucide-react';
import { useLang } from '../lib/i18n';
import { ROUTE_PRESETS, LANDMARKS } from '../lib/marsData';

export default function Home() {
  const { pick } = useLang();

  return (
    <div className="bg-abyss text-ink overflow-x-hidden">
      {/* ============================ HERO ============================ */}
      <section className="relative min-h-[calc(100dvh-3.5rem)] flex flex-col justify-end overflow-hidden">
        <img src="/img/hero-mars.jpg" alt="Astronauts surveying a Martian canyon" className="absolute inset-0 w-full h-full object-cover object-[62%_38%]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#05060c]/92 via-[#05060c]/55 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#05060c] via-[#05060c]/25 to-transparent" />
        <div className="absolute inset-0 blueprint-grid opacity-60" />

        {/* floating telemetry card */}
        <div className="absolute top-6 end-4 sm:end-8 z-10 hidden md:block float-none">
          <div className="panel rounded-xl px-4 py-3 w-[218px] font-mono text-[10px] leading-relaxed">
            <div className="flex items-center justify-between border-b border-edge pb-1.5 mb-1.5">
              <span className="text-sand tracking-[0.2em] text-[8.5px]">SOL 5052 TELEMETRY</span>
              <span className="w-1.5 h-1.5 rounded-full bg-jade pulse-dot" />
            </div>
            {[
              ['LMST', '14:22'], ['AIR TEMP', '−63 °C'], ['PRESS', '6.1 hPa'],
              ['WIND', '9 m/s NW'], ['τ DUST', '0.42'], ['PWR', '812 W·h'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between"><span className="text-mute">{k}</span><span className="text-ink">{v}</span></div>
            ))}
          </div>
        </div>

        <div className="relative z-10 max-w-[1500px] mx-auto w-full px-5 sm:px-8 pb-16 pt-24">
          <div className="max-w-2xl">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-px w-12 bg-ember/70" />
              <span className="text-[10px] sm:text-[11px] font-mono tracking-[0.3em] text-sand">FIRST CREWED EXPEDITION · PLANNING CONSOLE</span>
            </div>
            <h1 className="font-display font-bold tracking-tight leading-[0.98] text-[44px] sm:text-6xl xl:text-7xl">
              MARS<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ffb27a] via-ember to-mars text-glow">SURVIVAL</span><br />
              GUIDE
            </h1>
            <p className="mt-3 font-arabic text-[17px] sm:text-xl text-[#ffd9c2]/90">دليل البقاء على المريخ</p>
            <p className="mt-4 text-[14px] sm:text-[15px] leading-relaxed text-ink/85 max-w-xl">
              {pick(
                'Plot a route across the Red Planet before anyone sets a boot on it. Real MOLA elevations, real orbital imagery, real risk math — a flight-director-grade console for choosing a safe path across Mars.',
                'ارسم مسارًا عبر الكوكب الأحمر قبل أن تطأ الأرضه أي قدم. ارتفاعات MOLA حقيقية، صور مدارية حقيقية، وحسابات مخاطر حقيقية — منصة بمستوى مدير الطيران لاختيار طريق آمن عبر المريخ.'
              )}
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link to="/planner" className="h-12 ps-5 pe-4 rounded-lg bg-gradient-to-b from-ember to-mars text-[#fff3e8] font-display font-bold tracking-wide flex items-center gap-2 hover:brightness-110 transition shadow-[0_10px_34px_rgba(193,68,14,0.5)]">
                {pick('OPEN THE 3D GLOBE', 'افتح الكرة ثلاثية الأبعاد')} <ChevronRight size={18} strokeWidth={2.5} />
              </Link>
              <Link to="/missions" className="h-12 px-5 rounded-lg border border-edge2 bg-black/45 backdrop-blur text-ink/90 font-semibold text-[13px] flex items-center gap-2 hover:border-cyanx/50 hover:text-cyanx transition-colors">
                <Database size={16} /> {pick('Explore the mission data', 'استكشف بيانات المهمات')}
              </Link>
            </div>
            <div className="mt-8 flex items-center gap-5 text-[9.5px] font-mono text-mute">
              <span className="flex items-center gap-1.5"><CircleDot size={9} className="text-cyanx" /> 45.22 KM PERSEVERANCE</span>
              <span className="flex items-center gap-1.5"><CircleDot size={9} className="text-ember" /> −8,177 → +21,171 M MOLA</span>
              <span className="hidden sm:flex items-center gap-1.5"><CircleDot size={9} className="text-sand" /> 76 M/PX ORTHOMOSAIC</span>
            </div>
          </div>
        </div>

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1 text-mute/80">
          <ArrowDown size={15} className="animate-bounce" />
          <span className="text-[8px] font-mono tracking-[0.3em]">SCROLL</span>
        </div>
      </section>

      {/* ====================== MISSION STAT STRIP ====================== */}
      <section className="border-y border-edge bg-[#0a0b14]">
        <div className="max-w-[1500px] mx-auto px-5 sm:px-8 h-14 flex items-center gap-8 overflow-x-auto slim-scroll whitespace-nowrap text-[10px] font-mono text-mute">
          <span>DISTANCE RECORD <b className="text-cyanx">45.22 KM</b> PERSEVERANCE · SOL 2006</span>
          <span className="text-edge2">|</span>
          <span>CURIOSITY ODOMETER <b className="text-cyanx">36.86 KM</b> · SOL 5052</span>
          <span className="text-edge2">|</span>
          <span>HIGHEST PEAK <b className="text-sand">+21.9 KM</b> OLYMPUS MONS</span>
          <span className="text-edge2">|</span>
          <span>DEEPEST BASIN <b className="text-violet">−8.2 KM</b> HELLAS PLANITIA</span>
          <span className="text-edge2">|</span>
          <span>GRAVITY <b className="text-ink">3.72 m/s²</b> · 38 % OF EARTH</span>
          <span className="text-edge2">|</span>
          <span>DAY LENGTH <b className="text-ink">24h 39m 35s</b></span>
        </div>
      </section>

      {/* ================== THE PROBLEM / WHY IT MATTERS ================== */}
      <section className="relative max-w-[1500px] mx-auto px-5 sm:px-8 py-16 grid lg:grid-cols-2 gap-10 items-center">
        <div className="relative order-2 lg:order-1">
          <img src="/img/gale-buttes.jpg" alt="Murray Buttes in Gale Crater, photographed by Curiosity" className="rounded-2xl border border-edge2 shadow-2xl w-full aspect-[16/9] object-cover" />
          <div className="absolute -bottom-4 start-4 panel rounded-lg px-3 py-1.5 text-[9px] font-mono text-sand">MURRAY BUTTES · GALE CRATER · CURIOSITY MASTCAM · 2016</div>
          <div className="absolute -top-3 end-6 panel rounded-lg px-3 py-1.5 text-[9px] font-mono text-mute hidden sm:block">CTX 5 M/PX · BASEMAP</div>
        </div>
        <div className="order-1 lg:order-2">
          <div className="text-[10px] font-mono tracking-[0.3em] text-ember mb-3">01 · THE PROBLEM</div>
          <h2 className="font-display font-bold text-3xl sm:text-4xl leading-[1.05] tracking-tight">
            Mars doesn't forgive<br /><span className="text-ember">bad route math.</span>
          </h2>
          <p className="mt-4 text-[14px] leading-relaxed text-ink/85 max-w-lg">
            {pick(
              'A human crew on Mars gets one chance. A bad corridor means exhausted consumables, a 25° slope the rover can\'t climb, a 7 km wall at Valles Marineris, or a dust season that strands you 800 km from base. Every mission since Viking has mapped this planet in exquisite detail — this console turns those archives into decisions.',
              'طاقم بشري على المريخ يحصل على فرصة واحدة فقط. اختيار ممر خاطئ يعني استنزاف المؤن، أو انحدارًا بدرجة 25 لا تستطيع العربة تسلقه، أو جدارًا بارتفاع 7 كم عند فاليز مارينيريس، أو موسم غبار يحبسك على بعد 800 كم من القاعدة. كل مهمة منذ فايكنغ قامت بتخطيط هذا الكوكب بدقة متناهية — وهذه المنصة تحول تلك الأرشيفات إلى قرارات.'
            )}
          </p>
          <div className="mt-6 grid grid-cols-3 gap-3 max-w-lg">
            {[
              { icon: AlertTriangle, n: '25°', d: pick('Rover climb limit — Spirit\'s final slope, Feb 2010', 'حد تسلق العربات — انحدار سبيريت الأخير، فبراير 2010') },
              { icon: Wind, n: '2×', d: pick('Dust-storm optical depth can double battery drain fleet-wide', 'قد يتضاعف استنزاف البطاريات عند تضاعف كثافة الغبار') },
              { icon: Clock, n: '22 min', d: pick('One-way light time — Mars crews drive themselves', 'زمن وصول الإشارة — أطقم المريخ تقود نفسها بنفسها') },
            ].map((s, i) => {
              const I = s.icon;
              return (
                <div key={i} className="panel-inset rounded-xl p-3">
                  <I size={16} className="text-amberx mb-1.5" />
                  <div className="font-display font-bold text-lg text-ink leading-none">{s.n}</div>
                  <div className="mt-1.5 text-[8.5px] leading-snug text-mute">{s.d}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================== THE SOLUTION / CONSOLE PREVIEW ================== */}
      <section className="border-t border-edge bg-[#0a0b14] blueprint-grid">
        <div className="max-w-[1500px] mx-auto px-5 sm:px-8 py-16">
          <div className="flex flex-wrap items-end justify-between gap-6 mb-8">
            <div>
              <div className="text-[10px] font-mono tracking-[0.3em] text-ember mb-3">02 · THE SOLUTION</div>
              <h2 className="font-display font-bold text-3xl sm:text-4xl leading-[1.05] tracking-tight max-w-xl">
                One globe.<br /><span className="text-cyanx cyan-glow">Every dataset.</span> Zero guesswork.
              </h2>
            </div>
            <Link to="/planner" className="h-11 ps-4 pe-3 rounded-lg border border-cyanx/45 bg-cyanx/10 text-cyanx font-semibold text-[12px] flex items-center gap-2 hover:bg-cyanx/20 transition-colors">
              LAUNCH CONSOLE <ChevronRight size={16} />
            </Link>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: Mountain, tag: 'MOLA · MGS', title: 'Topography & Slope', titleAr: 'التضاريس والانحدار', d: '16 px/degree global DEM from 600 million laser shots. Slope by central differences, sampled live along your route at 18 km intervals.', tone: 'text-sand', bar: 'from-sand/60' },
              { icon: Satellite, tag: 'HiRISE · CTX · T1', title: 'Orbital Imagery', titleAr: 'صور مدارية', d: 'Global color orthomosaic at 76 m/px draped over the globe — switch between true-color photo, MOLA hillshade, THEMIS thermal IR and slope shading.', tone: 'text-cyanx', bar: 'from-cyanx/60' },
              { icon: Gauge, tag: 'EACHTO ENGINE', title: 'Live Risk Analysis', titleAr: 'تحليل المخاطر الحي', d: 'Haversine distance, elevation profile, max/mean slope, terrain roughness, vehicle limits — fused into a 0–100 safety score with named hazard windows.', tone: 'text-ember', bar: 'from-ember/60' },
            ].map((c, i) => {
              const I = c.icon;
              return (
                <div key={i} className="panel rounded-2xl p-6 relative overflow-hidden group hover:border-ember/40 transition-colors">
                  <div className={`absolute top-0 inset-x-0 h-px bg-gradient-to-r ${c.bar} to-transparent`} />
                  <I size={26} className={`${c.tone} mb-3`} strokeWidth={1.6} />
                  <div className="text-[9px] font-mono tracking-[0.25em] text-mute">{c.tag}</div>
                  <div className="font-display font-bold text-lg mt-1">{c.title}</div>
                  <div className="font-arabic text-[11px] text-mute">{c.titleAr}</div>
                  <p className="mt-3 text-[12px] leading-relaxed text-ink/80">{c.d}</p>
                </div>
              );
            })}
          </div>

          {/* mini route preview */}
          <div className="mt-8 panel rounded-2xl px-5 py-4 flex flex-wrap items-center gap-x-8 gap-y-3">
            <div className="flex items-center gap-2 text-[10px] font-mono text-mute"><Radar size={13} className="text-ember" /> EXAMPLE COMPUTED CORRIDOR — JEZERO → GALE</div>
            {[['Ruler', '1,940 km', 'DISTANCE'], ['Clock', '19 days', '@ CREW DRIVE PACE'], ['TrendingUp', '11.4°', 'MAX SLOPE AT SYRTIS'], ['ShieldCheck', '58 / 100', 'CAUTION — DETOUR ADVISED']].map(([icon, v, l], i) => {
              const Icon = icon === 'Ruler' ? Ruler : icon === 'Clock' ? Clock : icon === 'TrendingUp' ? TrendingUp : ShieldCheck;
              return (
                <div key={i} className="flex items-center gap-2">
                  <Icon size={14} className="text-cyanx" />
                  <div><div className="font-mono font-semibold text-[12px] text-ink leading-none">{v}</div><div className="text-[7.5px] font-mono text-mute tracking-widest mt-0.5">{l}</div></div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================== SUGGESTED EXPEDITIONS ================== */}
      <section className="max-w-[1500px] mx-auto px-5 sm:px-8 py-16">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-[10px] font-mono tracking-[0.3em] text-ember mb-2">03 · PLOTTED CORRIDORS</div>
            <h2 className="font-display font-bold text-2xl sm:text-3xl tracking-tight">Five expeditions, pre-computed</h2>
          </div>
          <Link to="/planner" className="text-[11px] font-mono text-cyanx hover:underline hidden sm:block">PLOT YOUR OWN →</Link>
        </div>
        <div className="grid sm:grid-cols-2 xl:grid-cols-5 gap-3">
          {ROUTE_PRESETS.map(p => (
            <Link key={p.id} to={`/planner?preset=${p.id}`} className="panel-inset rounded-xl p-4 flex flex-col hover:border-ember/45 hover:-translate-y-0.5 transition-all group">
              <div className={`text-[8px] font-mono tracking-[0.25em] ${p.difficulty === 'Extreme' ? 'text-blood' : p.difficulty === 'Hard' ? 'text-amberx' : 'text-jade'}`}>{p.difficulty.toUpperCase()}</div>
              <div className="mt-1.5 font-display font-semibold text-[12.5px] leading-snug text-ink group-hover:text-[#ffd9c2] transition-colors">{p.title}</div>
              <div className="font-arabic text-[9px] text-mute mt-0.5 leading-snug">{p.titleAr}</div>
              <div className="mt-auto pt-3 text-[8px] font-mono text-mute">{p.points.length} WAYPOINTS · {p.vehicle.toUpperCase()}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* ================== PLANET FACTS / WHY MARS ================== */}
      <section className="relative border-t border-edge overflow-hidden">
        <img src="/img/perseverance-selfie.jpg" alt="Perseverance rover seen from Ingenuity helicopter" className="absolute inset-0 w-full h-full object-cover object-center opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#05060c]/95 via-[#05060c]/70 to-[#05060c]/20" />
        <div className="relative max-w-[1500px] mx-auto px-5 sm:px-8 py-16 max-w-none">
          <div className="max-w-xl">
            <div className="text-[10px] font-mono tracking-[0.3em] text-ember mb-3">04 · KNOW YOUR PLANET</div>
            <h2 className="font-display font-bold text-3xl sm:text-4xl leading-[1.05]">The case for<br /><span className="text-sand">one giant leap.</span></h2>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {[
                { icon: Sun, k: '589 W/m²', v: pick('Solar constant — 43 % of Earth\'s. Big panels, bigger batteries.', 'الثابت الشمسي — 43٪ من الأرض. ألواح أكبر وبطاريات أكبر.') },
                { icon: Wind, k: '0.6 kPa', v: pick('Average pressure — 0.6 % of sea level. Suits are not optional.', 'الضغط المتوسط — 0.6٪ من مستوى سطح البحر. البدلات ليست اختيارية.') },
                { icon: Droplets, k: '5.6 %', v: pick('Atmospheric water-vapor ceiling at night — ISRU can drink it.', 'الحد الأقصى لبخار الماء ليلاً — وحدات ISRU تستطيع شربه.') },
                { icon: Globe, k: '37° tilt', v: pick('Axial tilt like Earth — seasons, ice caps and dust storms.', 'ميل محوري كالأرض — فصول وأغطية جليدية وعواصف غبارية.') },
              ].map((f, i) => {
                const I = f.icon;
                return (
                  <div key={i} className="rounded-xl border border-white/10 bg-black/55 backdrop-blur-md p-4">
                    <I size={17} className="text-sand mb-2" />
                    <div className="font-mono font-bold text-base text-ink">{f.k}</div>
                    <div className="mt-1 text-[9.5px] leading-snug text-white/75">{f.v}</div>
                  </div>
                );
              })}
            </div>
            <Link to="/landing-sites" className="mt-6 inline-flex h-11 px-5 rounded-lg bg-sand text-[#241203] font-display font-bold text-[12px] items-center gap-2 hover:brightness-110 transition">
              SCORE EVERY LANDING SITE <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
